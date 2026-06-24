"""
Meeting notes generation service.

Supports Gemini directly via uploaded audio, while preserving the existing
OpenAI-compatible fallback when OPENAI_API_KEY is configured instead.
"""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from io import BytesIO
import json
import logging
import os
from pathlib import Path
import tempfile
import time
import uuid
from typing import Any, Dict, Tuple

import requests
from werkzeug.datastructures import FileStorage

from config import Config
from database.connection import get_db_connection, return_connection
from services.s3_storage_service import (
    download_s3_object,
    generate_presigned_download_url,
    get_s3_configuration_error,
    is_s3_configured,
    upload_meeting_audio,
    upload_meeting_report,
)

logger = logging.getLogger(__name__)
_FASTER_WHISPER_MODEL = None
_PYANNOTE_PIPELINE = None

# Gemini inline_data is capped at ~20MB; use the File API for larger files
_GEMINI_INLINE_MAX_BYTES = 15 * 1024 * 1024  # 15 MB

# ---------------------------------------------------------------------------
# Startup diagnostic — logs S3 config state so misconfiguration is visible
# immediately in server output rather than silently failing at request time.
# ---------------------------------------------------------------------------
def _log_s3_config_state() -> None:
    from services.s3_storage_service import get_s3_configuration_error, is_s3_configured  # local import avoids circular at module load
    bucket   = Config.MEETING_NOTES_S3_BUCKET
    region   = Config.MEETING_NOTES_S3_REGION
    key_id   = Config.MEETING_NOTES_AWS_ACCESS_KEY_ID
    secret   = Config.MEETING_NOTES_AWS_SECRET_ACCESS_KEY

    logger.info(
        "S3 config check — bucket=%r region=%r key_id=%r secret_set=%s configured=%s error=%r",
        bucket or "(empty)",
        region or "(empty)",
        key_id or "(empty)",
        bool(secret),
        is_s3_configured(),
        get_s3_configuration_error(),
    )

_log_s3_config_state()


def _error(message: str, status_code: int) -> Tuple[Dict[str, Any], int]:
    return {"success": False, "message": message}, status_code


def _get_audio_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].strip().lower()


def _validate_audio_file(audio_file) -> Tuple[bool, str | None]:
    if audio_file is None:
        return False, "audio file is required"

    filename = (audio_file.filename or "").strip()
    if not filename:
        return False, "audio filename is required"

    extension = _get_audio_extension(filename)
    if extension not in Config.MEETING_NOTES_ALLOWED_EXTENSIONS:
        return (
            False,
            "Unsupported audio format. Allowed formats: "
            + ", ".join(Config.MEETING_NOTES_ALLOWED_EXTENSIONS),
        )

    return True, None


def _read_audio_bytes(audio_file) -> bytes:
    audio_file.stream.seek(0)
    audio_bytes = audio_file.stream.read()
    audio_file.stream.seek(0)
    return audio_bytes


def _normalize_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if text:
                    parts.append(str(text))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts)
    return str(content or "")


def _parse_structured_notes(content: str) -> Dict[str, Any]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Meeting notes generation did not return valid JSON") from exc

    important_points = parsed.get("important_points")
    if isinstance(important_points, list):
        cleaned_points = [str(point).strip() for point in important_points if str(point).strip()]
    else:
        cleaned_points = []

    return {
        "transcript": str(parsed.get("transcript") or "").strip(),
        "summary": str(parsed.get("summary") or "").strip(),
        "minutes_of_meeting": str(parsed.get("minutes_of_meeting") or "").strip(),
        "important_points": cleaned_points,
    }


def _meeting_prompt_from_transcript(
    transcript: str,
    *,
    meeting_title: str | None = None,
    language: str | None = None,
) -> str:
    title_text = (meeting_title or "").strip() or "Not Specified"
    language_text = (language or "").strip() or "Not Specified"
    return (
        "You are an expert Business Analyst and Meeting Secretary.\n\n"
        "Your task is to generate professional Minutes of Meeting (MoM) from the provided meeting transcript.\n\n"
        "Instructions:\n"
        "1. Use ONLY the information present in the transcript.\n"
        "2. Do NOT invent attendees, decisions, deadlines, action items, or technical details.\n"
        '3. If information is unclear or missing, explicitly mention "Not Specified".\n'
        "4. Remove filler words, repeated statements, interruptions, and casual conversation.\n"
        "5. Consolidate duplicate discussion points.\n"
        "6. Preserve all important business, technical, product, project, architectural, operational, and management decisions.\n"
        "7. Extract action items even if they are mentioned indirectly.\n"
        "8. Associate action items with the responsible person whenever possible.\n"
        "9. If speaker names are available, use them. Otherwise use Speaker 1, Speaker 2, etc.\n"
        "10. Format the response in Markdown.\n\n"
        "Return valid JSON only with this exact shape:\n"
        "{\n"
        '  "transcript": "cleaned speaker-tagged transcript",\n'
        '  "summary": "5-10 bullet executive summary in markdown",\n'
        '  "minutes_of_meeting": "full markdown document using the required structure",\n'
        '  "important_points": ["short point 1", "short point 2", "short point 3"]\n'
        "}\n\n"
        "The `minutes_of_meeting` field must contain a markdown document with exactly these sections:\n"
        "# Minutes of Meeting\n"
        "## Meeting Summary\n"
        "## Key Discussion Points\n"
        "## Decisions Made\n"
        "## Action Items\n"
        "## Open Questions\n"
        "## Risks and Dependencies\n"
        "## Next Steps\n"
        "## Participants\n"
        "## Transcript Confidence Notes\n\n"
        "Action Items must include a markdown table with columns:\n"
        "Action Item | Owner | Due Date | Priority\n"
        'Use "Not Specified" when data is missing. Infer priority only when clearly justified.\n\n'
        f"Meeting title: {title_text}\n"
        f"Preferred language handling: {language_text}\n\n"
        f"Transcript:\n{transcript}"
    )


def _write_audio_to_tempfile(audio_file) -> tuple[str, bytes]:
    audio_bytes = _read_audio_bytes(audio_file)
    suffix = Path((audio_file.filename or "meeting-audio")).suffix or ".audio"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp_file.write(audio_bytes)
        tmp_file.flush()
        return tmp_file.name, audio_bytes
    finally:
        tmp_file.close()


def _load_faster_whisper_model():
    global _FASTER_WHISPER_MODEL
    if _FASTER_WHISPER_MODEL is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "Local transcription requires faster-whisper. Install meeting-notes audio dependencies first."
            ) from exc

        _FASTER_WHISPER_MODEL = WhisperModel(
            Config.MEETING_NOTES_FASTER_WHISPER_MODEL,
            device=Config.MEETING_NOTES_FASTER_WHISPER_DEVICE,
            compute_type=Config.MEETING_NOTES_FASTER_WHISPER_COMPUTE_TYPE,
        )
    return _FASTER_WHISPER_MODEL


def _load_pyannote_pipeline():
    global _PYANNOTE_PIPELINE
    if not Config.MEETING_NOTES_ENABLE_DIARIZATION:
        return None
    if not Config.HUGGINGFACE_TOKEN:
        logger.warning("Meeting-notes diarization skipped because HUGGINGFACE_TOKEN is not configured")
        return None
    if _PYANNOTE_PIPELINE is None:
        try:
            from pyannote.audio import Pipeline
        except ImportError as exc:
            raise RuntimeError(
                "Speaker diarization requires pyannote.audio. Install meeting-notes audio dependencies first."
            ) from exc

        _PYANNOTE_PIPELINE = Pipeline.from_pretrained(
            Config.MEETING_NOTES_DIARIZATION_MODEL,
            use_auth_token=Config.HUGGINGFACE_TOKEN,
        )
    return _PYANNOTE_PIPELINE


def _transcribe_audio_locally(audio_file, language: str | None = None) -> str:
    audio_path, _ = _write_audio_to_tempfile(audio_file)
    try:
        whisper_model = _load_faster_whisper_model()
        task_language = (language or "").strip() or None
        segments, _ = whisper_model.transcribe(
            audio_path,
            language=task_language,
            vad_filter=True,
        )
        transcript_segments = []
        for segment in segments:
            text = str(getattr(segment, "text", "") or "").strip()
            if not text:
                continue
            transcript_segments.append(
                {
                    "start": float(getattr(segment, "start", 0.0) or 0.0),
                    "end": float(getattr(segment, "end", 0.0) or 0.0),
                    "text": text,
                }
            )

        if not transcript_segments:
            raise RuntimeError("Local transcription completed but no transcript was returned")

        diarization_pipeline = _load_pyannote_pipeline()
        speaker_segments = []
        if diarization_pipeline is not None:
            diarization = diarization_pipeline(audio_path)
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                speaker_segments.append(
                    {
                        "start": float(turn.start),
                        "end": float(turn.end),
                        "speaker": str(speaker),
                    }
                )

        if not speaker_segments:
            return "\n".join(f"[Speaker 1]: {segment['text']}" for segment in transcript_segments)

        speaker_name_map: Dict[str, str] = {}
        speaker_counter = 0
        transcript_lines = []
        last_speaker = None

        for segment in transcript_segments:
            midpoint = (segment["start"] + segment["end"]) / 2.0
            matched_speaker = None
            for speaker_segment in speaker_segments:
                if speaker_segment["start"] <= midpoint <= speaker_segment["end"]:
                    matched_speaker = speaker_segment["speaker"]
                    break
            if matched_speaker is None:
                matched_speaker = last_speaker or speaker_segments[0]["speaker"]

            if matched_speaker not in speaker_name_map:
                speaker_counter += 1
                speaker_name_map[matched_speaker] = f"Speaker {speaker_counter}"

            normalized_speaker = speaker_name_map[matched_speaker]
            transcript_lines.append(f"[{normalized_speaker}]: {segment['text']}")
            last_speaker = matched_speaker

        return "\n".join(transcript_lines)
    finally:
        try:
            os.remove(audio_path)
        except OSError:
            logger.warning("Failed to remove temporary meeting-notes audio file: %s", audio_path)


def _build_openai_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {Config.OPENAI_API_KEY}"}


def _generate_transcript(audio_file, language: str | None = None) -> str:
    if Config.MEETING_NOTES_USE_LOCAL_TRANSCRIPTION:
        try:
            return _transcribe_audio_locally(audio_file, language=language)
        except Exception as exc:
            logger.warning("Local meeting-notes transcription failed; falling back to API transcription: %s", exc)
            if not Config.OPENAI_API_KEY:
                raise RuntimeError(
                    "Local transcription failed and OPENAI_API_KEY is not configured for fallback transcription."
                ) from exc
    return _generate_transcript_with_openai(audio_file, language=language)


def _generate_transcript_with_openai(audio_file, language: str | None = None) -> str:
    transcription_url = f"{Config.OPENAI_BASE_URL}/audio/transcriptions"
    form_data = {"model": Config.MEETING_NOTES_TRANSCRIPTION_MODEL}
    if language:
        form_data["language"] = language.strip()

    audio_file.stream.seek(0)
    file_tuple = (
        audio_file.filename,
        audio_file.stream,
        audio_file.mimetype or "application/octet-stream",
    )
    transcription_response = requests.post(
        transcription_url,
        headers=_build_openai_headers(),
        data=form_data,
        files={"file": file_tuple},
        timeout=Config.MEETING_NOTES_REQUEST_TIMEOUT,
    )

    if not transcription_response.ok:
        raise RuntimeError(
            f"Audio transcription failed with status {transcription_response.status_code}: {transcription_response.text}"
        )

    transcript = (transcription_response.json().get("text") or "").strip()
    if not transcript:
        raise RuntimeError("Transcription completed but no transcript was returned")
    return transcript


def _upload_to_gemini_file_api(audio_bytes: bytes, mime_type: str, filename: str) -> str:
    """Upload audio to Gemini File API via resumable upload and return the file URI."""
    start_url = (
        "https://generativelanguage.googleapis.com/upload/v1beta/files"
        f"?key={Config.GEMINI_API_KEY}"
    )
    start_headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(len(audio_bytes)),
        "X-Goog-Upload-Header-Content-Type": mime_type,
        "Content-Type": "application/json",
    }
    start_response = requests.post(
        start_url,
        headers=start_headers,
        json={"file": {"display_name": filename}},
        timeout=60,
    )
    if not start_response.ok:
        raise RuntimeError(
            f"Gemini File API upload initiation failed with status "
            f"{start_response.status_code}: {start_response.text}"
        )
    upload_url = start_response.headers.get("X-Goog-Upload-URL")
    if not upload_url:
        raise RuntimeError("Gemini File API did not return an upload URL")

    upload_headers = {
        "Content-Length": str(len(audio_bytes)),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
    }
    upload_response = requests.post(
        upload_url,
        headers=upload_headers,
        data=audio_bytes,
        timeout=Config.MEETING_NOTES_REQUEST_TIMEOUT,
    )
    if not upload_response.ok:
        raise RuntimeError(
            f"Gemini File API upload failed with status "
            f"{upload_response.status_code}: {upload_response.text}"
        )
    file_data = upload_response.json().get("file") or {}
    file_uri = file_data.get("uri")
    file_name = file_data.get("name")
    if not file_uri:
        raise RuntimeError("Gemini File API upload completed but returned no file URI")
    logger.info("Gemini File API upload completed file_uri=%s", file_uri)

    # Poll until ACTIVE (audio files transition quickly, but large files may take a moment)
    if file_name:
        for _ in range(10):
            state_resp = requests.get(
                f"https://generativelanguage.googleapis.com/v1beta/{file_name}"
                f"?key={Config.GEMINI_API_KEY}",
                timeout=30,
            )
            if state_resp.ok and state_resp.json().get("state") == "ACTIVE":
                break
            time.sleep(2)

    return file_uri


def _generate_notes_with_gemini_from_audio(
    audio_file,
    *,
    meeting_title: str | None = None,
    language: str | None = None,
) -> Dict[str, Any]:
    audio_bytes = _read_audio_bytes(audio_file)
    mime_type = audio_file.mimetype or "application/octet-stream"
    filename = (audio_file.filename or "meeting-audio")

    if len(audio_bytes) > _GEMINI_INLINE_MAX_BYTES:
        logger.info(
            "Audio is %d bytes (>%d); uploading via Gemini File API",
            len(audio_bytes),
            _GEMINI_INLINE_MAX_BYTES,
        )
        file_uri = _upload_to_gemini_file_api(audio_bytes, mime_type, filename)
        audio_part = {
            "file_data": {
                "mime_type": mime_type,
                "file_uri": file_uri,
            }
        }
    else:
        audio_part = {
            "inline_data": {
                "mime_type": mime_type,
                "data": base64.b64encode(audio_bytes).decode("ascii"),
            }
        }

    url = (
        f"{Config.GEMINI_BASE_URL}/models/{Config.GEMINI_MEETING_NOTES_MODEL}:generateContent"
        f"?key={Config.GEMINI_API_KEY}"
    )
    payload = {
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Listen to the uploaded meeting audio and return valid JSON with keys "
                            "`transcript`, `summary`, `minutes_of_meeting`, and `important_points` only.\n"
                            "Use the transcript content only. If anything is unclear, say Not Specified.\n"
                            f"Meeting title: {(meeting_title or '').strip() or 'Not Specified'}\n"
                            f"Preferred language handling: {(language or '').strip() or 'Not Specified'}"
                        )
                    },
                    audio_part,
                ]
            }
        ],
    }

    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=Config.MEETING_NOTES_REQUEST_TIMEOUT,
    )
    if not response.ok:
        raise RuntimeError(
            f"Gemini meeting notes generation failed with status {response.status_code}: {response.text}"
        )

    result = response.json()
    candidates = result.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini meeting notes generation returned no candidates")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    raw_text = "".join(str(part.get("text") or "") for part in parts).strip()
    if not raw_text:
        raise RuntimeError("Gemini meeting notes generation returned empty content")

    return _parse_structured_notes(raw_text)


def _generate_notes_with_openai(audio_file, meeting_title: str | None = None, language: str | None = None) -> Dict[str, Any]:
    transcript = _generate_transcript(audio_file, language=language)

    completion_url = f"{Config.OPENAI_BASE_URL}/chat/completions"
    completion_payload = {
        "model": Config.MEETING_NOTES_COMPLETION_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "Return only valid JSON."},
            {
                "role": "user",
                "content": _meeting_prompt_from_transcript(
                    transcript,
                    meeting_title=meeting_title,
                    language=language,
                ),
            },
        ],
        "response_format": {"type": "json_object"},
    }

    completion_response = requests.post(
        completion_url,
        headers={**_build_openai_headers(), "Content-Type": "application/json"},
        json=completion_payload,
        timeout=Config.MEETING_NOTES_REQUEST_TIMEOUT,
    )

    if not completion_response.ok:
        raise RuntimeError(
            f"Meeting notes generation failed with status {completion_response.status_code}: {completion_response.text}"
        )

    choices = completion_response.json().get("choices") or []
    if not choices:
        raise RuntimeError("Meeting notes generation returned no choices")

    message = choices[0].get("message") or {}
    content = _normalize_content(message.get("content")).strip()
    if not content:
        raise RuntimeError("Meeting notes generation returned empty content")

    structured = _parse_structured_notes(content)
    if not structured["transcript"]:
        structured["transcript"] = transcript
    return structured


def _generate_notes_with_gemini(audio_file, meeting_title: str | None = None, language: str | None = None) -> Dict[str, Any]:
    try:
        transcript = _generate_transcript(audio_file, language=language)
    except Exception as exc:
        logger.warning("Transcript-first Gemini flow failed; using direct-audio Gemini fallback: %s", exc)
        return _generate_notes_with_gemini_from_audio(
            audio_file,
            meeting_title=meeting_title,
            language=language,
        )

    url = (
        f"{Config.GEMINI_BASE_URL}/models/{Config.GEMINI_MEETING_NOTES_MODEL}:generateContent"
        f"?key={Config.GEMINI_API_KEY}"
    )
    payload = {
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
        "contents": [
            {
                "parts": [
                    {
                        "text": _meeting_prompt_from_transcript(
                            transcript,
                            meeting_title=meeting_title,
                            language=language,
                        )
                    },
                ]
            }
        ],
    }

    response = None
    max_attempts = max(1, int(Config.GEMINI_MEETING_NOTES_MAX_RETRIES))
    retry_delay_seconds = max(0.0, float(Config.GEMINI_MEETING_NOTES_RETRY_DELAY_SECONDS))

    for attempt in range(1, max_attempts + 1):
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=Config.MEETING_NOTES_REQUEST_TIMEOUT,
        )

        if response.ok:
            break

        is_retryable = response.status_code in {429, 500, 502, 503, 504}
        if not is_retryable or attempt == max_attempts:
            raise RuntimeError(
                f"Gemini meeting notes generation failed with status {response.status_code}: {response.text}"
            )

        sleep_seconds = retry_delay_seconds * attempt
        logger.warning(
            "Gemini meeting notes request failed with status %s on attempt %s/%s; retrying in %.1f seconds",
            response.status_code,
            attempt,
            max_attempts,
            sleep_seconds,
        )
        time.sleep(sleep_seconds)

    payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini meeting notes generation returned no candidates")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    raw_text = "".join(str(part.get("text") or "") for part in parts).strip()
    if not raw_text:
        raise RuntimeError("Gemini meeting notes generation returned empty content")

    structured = _parse_structured_notes(raw_text)
    if not structured["transcript"]:
        structured["transcript"] = transcript
    return structured


def _configured_provider() -> str | None:
    if Config.GEMINI_API_KEY:
        return "gemini"
    if Config.OPENAI_API_KEY:
        return "openai"
    return None


def _generate_meeting_note_id() -> str:
    return f"mn_{uuid.uuid4().hex[:16]}"


def _generate_meeting_note_job_id() -> str:
    return f"mnj_{uuid.uuid4().hex[:16]}"


def _extract_file_size(audio_file) -> int | None:
    try:
        audio_file.stream.seek(0, os.SEEK_END)
        file_size = audio_file.stream.tell()
        audio_file.stream.seek(0)
        return file_size
    except Exception:
        return None


def _validate_feature_and_file(audio_file):
    if not Config.FEATURE_MEETING_NOTES:
        return _error("Meeting notes feature is disabled", 503)

    is_valid, validation_message = _validate_audio_file(audio_file)
    if not is_valid:
        return _error(validation_message or "Invalid audio file", 400)

    file_size = _extract_file_size(audio_file)
    max_bytes = Config.MEETING_NOTES_MAX_UPLOAD_MB * 1024 * 1024
    if file_size is not None and file_size > max_bytes:
        return _error(
            f"Audio file is too large. Maximum allowed size is {Config.MEETING_NOTES_MAX_UPLOAD_MB} MB.",
            400,
        )

    return None


def _validate_feature_provider_and_file(audio_file):
    validation_error = _validate_feature_and_file(audio_file)
    if validation_error:
        return None, validation_error

    provider = _configured_provider()
    if provider is None:
        return None, _error(
            "Meeting notes AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY first.",
            503,
        )

    return provider, None


def _serialize_points(points: Any) -> str:
    return json.dumps(points if isinstance(points, list) else [], ensure_ascii=True)


def _deserialize_points(raw_value: Any) -> list[str]:
    if isinstance(raw_value, list):
        return [str(item).strip() for item in raw_value if str(item).strip()]
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item).strip() for item in parsed if str(item).strip()]


def _row_to_audio_storage(row) -> Dict[str, Any] | None:
    if not row.get("audio_object_name"):
        return None
    bucket = row.get("audio_bucket")
    object_name = row.get("audio_object_name")
    file_name = row.get("file_name")
    fresh_url = row.get("audio_url")
    if is_s3_configured() and bucket and object_name:
        if Config.MEETING_NOTES_S3_PUBLIC_READ:
            fresh_url = f"https://{bucket}.s3.{Config.MEETING_NOTES_S3_REGION}.amazonaws.com/{object_name}"
        else:
            fresh_url = generate_presigned_download_url(
                bucket,
                object_name,
                download_filename=file_name,
            )
    return {
        "bucket": bucket,
        "object_name": object_name,
        "file_name": file_name,
        "content_type": row.get("content_type") or "application/octet-stream",
        "size_bytes": row.get("audio_size_bytes"),
        "url": fresh_url,
        "object_url": row.get("audio_url"),
        "folder": Config.MEETING_NOTES_S3_AUDIO_PREFIX,
        "provider": "s3",
    }


def _row_to_report_storage(row) -> Dict[str, Any] | None:
    if not row.get("report_object_name"):
        return None
    bucket = row.get("report_bucket")
    object_name = row.get("report_object_name")
    file_name = row.get("report_file_name")
    fresh_download_url = row.get("report_download_url") or row.get("report_url")
    if is_s3_configured() and bucket and object_name:
        if Config.MEETING_NOTES_S3_PUBLIC_READ:
            fresh_download_url = f"https://{bucket}.s3.{Config.MEETING_NOTES_S3_REGION}.amazonaws.com/{object_name}"
        else:
            fresh_download_url = generate_presigned_download_url(
                bucket,
                object_name,
                download_filename=file_name,
            )
    return {
        "bucket": bucket,
        "object_name": object_name,
        "file_name": file_name,
        "content_type": row.get("report_content_type") or "application/pdf",
        "size_bytes": row.get("report_size_bytes"),
        "url": fresh_download_url,
        "object_url": row.get("report_url"),
        "download_url": fresh_download_url,
        "folder": Config.MEETING_NOTES_S3_REPORT_PREFIX,
        "provider": "s3",
    }


def _row_to_meeting_note_payload(row) -> Dict[str, Any]:
    return {
        "meeting_note_id": row["meeting_note_id"],
        "status": row.get("status"),
        "provider": row.get("provider"),
        "file_name": row.get("file_name"),
        "meeting_title": row.get("meeting_title"),
        "language": row.get("language"),
        "transcript": row.get("transcript"),
        "summary": row.get("summary"),
        "minutes_of_meeting": row.get("minutes_of_meeting"),
        "important_points": _deserialize_points(row.get("important_points_json")),
        "audio_storage": _row_to_audio_storage(row),
        "report_storage": _row_to_report_storage(row),
        "generated_at": row.get("generated_at").isoformat() if row.get("generated_at") else None,
        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updated_at": row.get("updated_at").isoformat() if row.get("updated_at") else None,
        "error_message": row.get("error_message"),
    }


def _fetch_meeting_note_record(meeting_note_id: str, emp_code: str | None = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "SELECT * FROM meeting_notes_records WHERE meeting_note_id = %s"
        params = [meeting_note_id]
        if emp_code:
            query += " AND emp_code = %s"
            params.append(emp_code)
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        cursor.close()
        return_connection(conn)


def _fetch_active_meeting_note_job(meeting_note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT *
            FROM meeting_notes_jobs
            WHERE meeting_note_id = %s
              AND status IN ('queued', 'processing', 'retrying')
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (meeting_note_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        cursor.close()
        return_connection(conn)


def _is_meeting_note_job_stale(job: Dict[str, Any] | None) -> bool:
    if not job or job.get("status") != "processing":
        return False

    reference_time = job.get("heartbeat_at") or job.get("updated_at") or job.get("started_at")
    if reference_time is None:
        return True

    stale_after = max(1, int(Config.MEETING_NOTES_QUEUE_STALE_MINUTES))
    if reference_time.tzinfo is None:
        stale_before = datetime.utcnow()
    else:
        stale_before = datetime.now(timezone.utc).astimezone(reference_time.tzinfo)
    return reference_time < stale_before - timedelta(minutes=stale_after)


def list_meeting_note_records(
    *,
    emp_code: str,
    status: str | None = None,
    limit: int = 50,
) -> Tuple[Dict[str, Any], int]:
    safe_limit = max(1, min(limit, 100))
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        params = [emp_code]
        where_clauses = ["emp_code = %s"]
        if status:
            where_clauses.append("status = %s")
            params.append(status)

        where_sql = " AND ".join(where_clauses)
        cursor.execute(
            f"""
            SELECT COUNT(*) AS total_count
            FROM meeting_notes_records
            WHERE {where_sql}
            """,
            tuple(params),
        )
        total_row = cursor.fetchone() or {}
        total_count = int(total_row.get("total_count") or 0)

        cursor.execute(
            f"""
            SELECT *
            FROM meeting_notes_records
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT %s
            """,
            tuple(params + [safe_limit]),
        )
        rows = cursor.fetchall() or []
        items = [_row_to_meeting_note_payload(dict(row)) for row in rows]
        return (
            {
                "success": True,
                "data": {
                    "items": items,
                    "count": len(items),
                    "total_count": total_count,
                    "limit": safe_limit,
                    "status_filter": status,
                },
            },
            200,
        )
    finally:
        cursor.close()
        return_connection(conn)


def get_meeting_note_record(
    meeting_note_id: str,
    *,
    emp_code: str,
) -> Tuple[Dict[str, Any], int]:
    record = _fetch_meeting_note_record(meeting_note_id, emp_code=emp_code)
    if not record:
        return _error("Meeting note not found", 404)
    return (
        {
            "success": True,
            "data": _row_to_meeting_note_payload(record),
        },
        200,
    )


def _insert_meeting_note_upload_record(
    *,
    meeting_note_id: str,
    emp_code: str | None,
    meeting_title: str | None,
    language: str | None,
    filename: str,
    content_type: str | None,
    provider: str,
    audio_storage: Dict[str, Any],
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO meeting_notes_records (
                meeting_note_id,
                emp_code,
                meeting_title,
                language,
                file_name,
                content_type,
                provider,
                status,
                audio_bucket,
                audio_object_name,
                audio_url,
                audio_folder,
                audio_size_bytes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'uploaded', %s, %s, %s, %s, %s)
            """,
            (
                meeting_note_id,
                emp_code,
                meeting_title,
                language,
                filename,
                content_type or "application/octet-stream",
                provider,
                audio_storage.get("bucket"),
                audio_storage.get("object_name"),
                audio_storage.get("url"),
                audio_storage.get("folder"),
                audio_storage.get("size_bytes"),
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _mark_meeting_note_processing(meeting_note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE meeting_notes_records
            SET status = 'processing', updated_at = NOW(), error_message = NULL
            WHERE meeting_note_id = %s
            """,
            (meeting_note_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _mark_meeting_note_queued(meeting_note_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE meeting_notes_records
            SET status = 'queued', updated_at = NOW(), error_message = NULL
            WHERE meeting_note_id = %s
            """,
            (meeting_note_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _update_meeting_note_generated(
    meeting_note_id: str,
    *,
    provider: str,
    structured_notes: Dict[str, Any],
    report_storage: Dict[str, Any] | None,
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE meeting_notes_records
            SET provider = %s,
                status = 'generated',
                transcript = %s,
                summary = %s,
                minutes_of_meeting = %s,
                important_points_json = %s,
                report_bucket = %s,
                report_object_name = %s,
                report_url = %s,
                report_download_url = %s,
                report_file_name = %s,
                report_content_type = %s,
                report_size_bytes = %s,
                generated_at = NOW(),
                updated_at = NOW(),
                error_message = NULL
            WHERE meeting_note_id = %s
            """,
            (
                provider,
                structured_notes["transcript"],
                structured_notes["summary"],
                structured_notes["minutes_of_meeting"],
                _serialize_points(structured_notes["important_points"]),
                report_storage.get("bucket") if report_storage else None,
                report_storage.get("object_name") if report_storage else None,
                report_storage.get("url") if report_storage else None,
                report_storage.get("download_url") if report_storage else None,
                report_storage.get("file_name") if report_storage else None,
                report_storage.get("content_type") if report_storage else None,
                report_storage.get("size_bytes") if report_storage else None,
                meeting_note_id,
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _update_meeting_note_failed(meeting_note_id: str, error_message: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE meeting_notes_records
            SET status = 'failed', updated_at = NOW(), error_message = %s
            WHERE meeting_note_id = %s
            """,
            (error_message[:1000], meeting_note_id),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _validate_saved_meeting_note_generation(
    meeting_note_id: str,
    *,
    emp_code: str | None = None,
) -> Tuple[str | None, Dict[str, Any] | None, Tuple[Dict[str, Any], int] | None]:
    if not Config.FEATURE_MEETING_NOTES:
        return None, None, _error("Meeting notes feature is disabled", 503)

    provider = _configured_provider()
    if provider is None:
        return None, None, _error(
            "Meeting notes AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY first.",
            503,
        )

    record = _fetch_meeting_note_record(meeting_note_id, emp_code=emp_code)
    if not record:
        return None, None, _error("Meeting note not found", 404)

    if not record.get("audio_bucket") or not record.get("audio_object_name"):
        return None, None, _error("Uploaded audio is missing for this meeting note", 400)

    return provider, record, None


def _create_meeting_note_job(
    meeting_note_id: str,
    *,
    emp_code: str | None,
    provider: str | None,
    max_attempts: int | None = None,
):
    conn = get_db_connection()
    cursor = conn.cursor()
    job_id = _generate_meeting_note_job_id()
    try:
        cursor.execute(
            """
            INSERT INTO meeting_notes_jobs (
                job_id,
                meeting_note_id,
                emp_code,
                provider,
                status,
                attempt_count,
                max_attempts,
                available_at
            ) VALUES (%s, %s, %s, %s, 'queued', 0, %s, NOW())
            RETURNING *
            """,
            (
                job_id,
                meeting_note_id,
                emp_code,
                provider,
                max(1, int(max_attempts or Config.MEETING_NOTES_QUEUE_MAX_RETRIES)),
            ),
        )
        row = cursor.fetchone()
        conn.commit()
        return dict(row) if row else None
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def _update_meeting_note_job_status(
    job_id: str,
    *,
    status: str,
    last_error: str | None = None,
    retry_delay_seconds: float | None = None,
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if retry_delay_seconds is not None:
            cursor.execute(
                """
                UPDATE meeting_notes_jobs
                SET status = %s,
                    last_error = %s,
                    available_at = NOW() + (%s * INTERVAL '1 second'),
                    finished_at = CASE WHEN %s IN ('completed', 'failed') THEN NOW() ELSE finished_at END,
                    updated_at = NOW()
                WHERE job_id = %s
                """,
                (status, (last_error or "")[:2000] or None, retry_delay_seconds, status, job_id),
            )
        else:
            cursor.execute(
                """
                UPDATE meeting_notes_jobs
                SET status = %s,
                    last_error = %s,
                    finished_at = CASE WHEN %s IN ('completed', 'failed') THEN NOW() ELSE finished_at END,
                    updated_at = NOW()
                WHERE job_id = %s
                """,
                (status, (last_error or "")[:2000] or None, status, job_id),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def claim_next_meeting_note_job() -> Dict[str, Any] | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        stale_after = max(1, int(Config.MEETING_NOTES_QUEUE_STALE_MINUTES))
        cursor.execute(
            """
            UPDATE meeting_notes_jobs
            SET status = 'retrying',
                available_at = NOW(),
                updated_at = NOW(),
                last_error = COALESCE(last_error, 'Worker heartbeat expired; re-queued automatically.')
            WHERE status = 'processing'
              AND heartbeat_at IS NOT NULL
              AND heartbeat_at < NOW() - (%s * INTERVAL '1 minute')
            """,
            (stale_after,),
        )

        cursor.execute(
            """
            WITH next_job AS (
                SELECT job_id
                FROM meeting_notes_jobs
                WHERE status IN ('queued', 'retrying')
                  AND available_at <= NOW()
                ORDER BY queued_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE meeting_notes_jobs jobs
            SET status = 'processing',
                attempt_count = jobs.attempt_count + 1,
                started_at = COALESCE(jobs.started_at, NOW()),
                heartbeat_at = NOW(),
                updated_at = NOW()
            FROM next_job
            WHERE jobs.job_id = next_job.job_id
            RETURNING jobs.*
            """
        )
        row = cursor.fetchone()
        conn.commit()
        return dict(row) if row else None
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def heartbeat_meeting_note_job(job_id: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE meeting_notes_jobs
            SET heartbeat_at = NOW(), updated_at = NOW()
            WHERE job_id = %s AND status = 'processing'
            """,
            (job_id,),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)


def process_meeting_note_job(job: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    job_id = str(job["job_id"])
    meeting_note_id = str(job["meeting_note_id"])
    emp_code = job.get("emp_code")
    try:
        heartbeat_meeting_note_job(job_id)
        response, status_code = generate_meeting_notes_from_saved(
            meeting_note_id,
            emp_code=emp_code,
            mark_processing=True,
        )
        if response.get("success"):
            _update_meeting_note_job_status(job_id, status="completed")
        else:
            raise RuntimeError(response.get("message") or "Meeting note generation failed")
        return response, status_code
    except Exception as exc:
        attempts = int(job.get("attempt_count") or 0)
        max_attempts = max(1, int(job.get("max_attempts") or Config.MEETING_NOTES_QUEUE_MAX_RETRIES))
        if attempts >= max_attempts:
            _update_meeting_note_job_status(job_id, status="failed", last_error=str(exc))
        else:
            delay_seconds = max(1.0, float(Config.MEETING_NOTES_QUEUE_RETRY_DELAY_SECONDS))
            _update_meeting_note_job_status(
                job_id,
                status="retrying",
                last_error=str(exc),
                retry_delay_seconds=delay_seconds,
            )
        raise


def queue_meeting_notes_generation_from_saved(
    meeting_note_id: str,
    *,
    emp_code: str | None = None,
    force: bool = False,
):
    provider, record, validation_error = _validate_saved_meeting_note_generation(
        meeting_note_id,
        emp_code=emp_code,
    )
    if validation_error:
        return validation_error

    active_job = _fetch_active_meeting_note_job(meeting_note_id)
    active_job_is_stale = _is_meeting_note_job_stale(active_job)
    if active_job and not force:
        job_status = active_job.get("status")
        message = (
            "Meeting notes generation is already in progress"
            if job_status == "processing"
            else "Meeting notes generation is already queued"
        )
        return (
            {
                "success": True,
                "message": message,
                "data": {
                    **_row_to_meeting_note_payload(record),
                    "job_id": active_job.get("job_id"),
                    "job_status": job_status,
                },
            },
            202,
        )

    if active_job and force and active_job.get("status") == "processing" and not active_job_is_stale:
        return (
            {
                "success": False,
                "message": "Meeting notes generation is actively processing and cannot be force re-queued yet",
                "data": {
                    **_row_to_meeting_note_payload(record),
                    "job_id": active_job.get("job_id"),
                    "job_status": active_job.get("status"),
                },
            },
            409,
        )

    if force and active_job:
        _update_meeting_note_job_status(
            str(active_job["job_id"]),
            status="failed",
            last_error="Superseded by a manual force restart request.",
        )

    _mark_meeting_note_queued(meeting_note_id)
    job = _create_meeting_note_job(
        meeting_note_id,
        emp_code=emp_code,
        provider=provider,
    )
    refreshed = _fetch_meeting_note_record(meeting_note_id, emp_code=emp_code) or record
    return (
        {
            "success": True,
            "message": (
                "Meeting notes generation re-queued"
                if force
                else "Meeting notes generation queued"
            ),
            "data": {
                **_row_to_meeting_note_payload(refreshed),
                "provider": provider,
                "job_id": job.get("job_id") if job else None,
                "job_status": job.get("status") if job else "queued",
            },
        },
        202,
    )


def upload_meeting_note_audio(
    audio_file,
    *,
    meeting_title: str | None = None,
    language: str | None = None,
    emp_code: str | None = None,
):
    validation_error = _validate_feature_and_file(audio_file)
    if validation_error:
        return validation_error

    logger.info(
        "upload_meeting_note_audio — S3 check: bucket=%r region=%r key_id=%r secret_set=%s configured=%s error=%r",
        Config.MEETING_NOTES_S3_BUCKET or "(empty)",
        Config.MEETING_NOTES_S3_REGION or "(empty)",
        Config.MEETING_NOTES_AWS_ACCESS_KEY_ID or "(empty)",
        bool(Config.MEETING_NOTES_AWS_SECRET_ACCESS_KEY),
        is_s3_configured(),
        get_s3_configuration_error(),
    )
    if not is_s3_configured():
        return _error(get_s3_configuration_error() or "S3 is not configured", 503)

    filename = (audio_file.filename or "").strip()
    audio_bytes = _read_audio_bytes(audio_file)
    audio_storage = upload_meeting_audio(
        audio_bytes,
        filename,
        content_type=audio_file.mimetype or "application/octet-stream",
        emp_code=emp_code,
        meeting_title=meeting_title,
    )
    meeting_note_id = _generate_meeting_note_id()
    _insert_meeting_note_upload_record(
        meeting_note_id=meeting_note_id,
        emp_code=emp_code,
        meeting_title=(meeting_title or "").strip() or None,
        language=(language or "").strip() or None,
        filename=filename,
        content_type=audio_file.mimetype or "application/octet-stream",
        provider=_configured_provider(),
        audio_storage=audio_storage,
    )
    return (
        {
            "success": True,
            "message": "Audio uploaded successfully",
            "data": {
                "meeting_note_id": meeting_note_id,
                "file_name": filename,
                "meeting_title": (meeting_title or "").strip() or None,
                "language": (language or "").strip() or None,
                "audio_storage": audio_storage,
                "status": "uploaded",
            },
        },
        201,
    )


def generate_meeting_notes_from_saved(
    meeting_note_id: str,
    *,
    emp_code: str | None = None,
    mark_processing: bool = True,
):
    provider, record, validation_error = _validate_saved_meeting_note_generation(
        meeting_note_id,
        emp_code=emp_code,
    )
    if validation_error:
        return validation_error

    if mark_processing:
        _mark_meeting_note_processing(meeting_note_id)

    try:
        downloaded = download_s3_object(record["audio_bucket"], record["audio_object_name"])
        audio_file = FileStorage(
            stream=BytesIO(downloaded["bytes"]),
            filename=record.get("file_name") or "meeting-audio",
            content_type=record.get("content_type") or downloaded.get("content_type") or "application/octet-stream",
        )

        if provider == "gemini":
            structured_notes = _generate_notes_with_gemini(
                audio_file,
                meeting_title=record.get("meeting_title"),
                language=record.get("language"),
            )
        else:
            structured_notes = _generate_notes_with_openai(
                audio_file,
                meeting_title=record.get("meeting_title"),
                language=record.get("language"),
            )

        report_storage = None
        if is_s3_configured():
            report_storage = upload_meeting_report(
                {
                    "meeting_title": record.get("meeting_title"),
                    "file_name": record.get("file_name"),
                    "provider": provider,
                    "transcript": structured_notes["transcript"],
                    "summary": structured_notes["summary"],
                    "minutes_of_meeting": structured_notes["minutes_of_meeting"],
                    "important_points": structured_notes["important_points"],
                    "audio_storage": _row_to_audio_storage(record),
                },
                emp_code=record.get("emp_code"),
                meeting_title=record.get("meeting_title"),
            )

        _update_meeting_note_generated(
            meeting_note_id,
            provider=provider,
            structured_notes=structured_notes,
            report_storage=report_storage,
        )
        refreshed = _fetch_meeting_note_record(meeting_note_id, emp_code=emp_code) or record
        return (
            {
                "success": True,
                "message": "Meeting notes generated successfully",
                "data": _row_to_meeting_note_payload(refreshed),
            },
            200,
        )
    except requests.Timeout as exc:
        logger.exception("Meeting notes provider timeout")
        timeout_message = (
            "Meeting notes provider timed out while generating the report. "
            f"Current timeout is {Config.MEETING_NOTES_REQUEST_TIMEOUT} seconds. "
            "Try again, increase MEETING_NOTES_REQUEST_TIMEOUT, or use a shorter audio file."
        )
        _update_meeting_note_failed(meeting_note_id, timeout_message)
        return _error(timeout_message, 504)
    except requests.RequestException as exc:
        logger.exception("Meeting notes request error")
        _update_meeting_note_failed(meeting_note_id, f"Meeting notes provider request failed: {exc}")
        return _error(f"Meeting notes provider request failed: {exc}", 502)
    except Exception as exc:
        logger.exception("Meeting notes generation error")
        _update_meeting_note_failed(meeting_note_id, str(exc))
        return _error(str(exc), 500)


def generate_meeting_notes(
    audio_file,
    meeting_title: str | None = None,
    language: str | None = None,
    emp_code: str | None = None,
):
    """Generate meeting outputs from an uploaded audio file."""
    provider, validation_error = _validate_feature_provider_and_file(audio_file)
    if validation_error:
        return validation_error

    filename = (audio_file.filename or "").strip()
    audio_storage = None
    report_storage = None

    audio_bytes = _read_audio_bytes(audio_file)

    try:
        if provider == "gemini":
            structured_notes = _generate_notes_with_gemini(
                audio_file,
                meeting_title=meeting_title,
                language=language,
            )
        else:
            structured_notes = _generate_notes_with_openai(
                audio_file,
                meeting_title=meeting_title,
                language=language,
            )

        if is_s3_configured():
            audio_storage = upload_meeting_audio(
                audio_bytes,
                filename,
                content_type=audio_file.mimetype or "application/octet-stream",
                emp_code=emp_code,
                meeting_title=meeting_title,
            )
            report_storage = upload_meeting_report(
                {
                    "meeting_title": (meeting_title or "").strip() or None,
                    "file_name": filename,
                    "provider": provider,
                    "transcript": structured_notes["transcript"],
                    "summary": structured_notes["summary"],
                    "minutes_of_meeting": structured_notes["minutes_of_meeting"],
                    "important_points": structured_notes["important_points"],
                    "audio_storage": audio_storage,
                },
                emp_code=emp_code,
                meeting_title=meeting_title,
            )

        return (
            {
                "success": True,
                "message": "Meeting notes generated successfully",
                "data": {
                    "provider": provider,
                    "file_name": filename,
                    "meeting_title": (meeting_title or "").strip() or None,
                    "transcript": structured_notes["transcript"],
                    "summary": structured_notes["summary"],
                    "minutes_of_meeting": structured_notes["minutes_of_meeting"],
                    "important_points": structured_notes["important_points"],
                    "audio_storage": audio_storage,
                    "report_storage": report_storage,
                },
            },
            200,
        )
    except requests.Timeout as exc:
        logger.exception("Meeting notes provider timeout")
        timeout_message = (
            "Meeting notes provider timed out while generating the report. "
            f"Current timeout is {Config.MEETING_NOTES_REQUEST_TIMEOUT} seconds. "
            "Try again, increase MEETING_NOTES_REQUEST_TIMEOUT, or use a shorter audio file."
        )
        return _error(timeout_message, 504)
    except requests.RequestException as exc:
        logger.exception("Meeting notes request error")
        return _error(f"Meeting notes provider request failed: {exc}", 502)
    except Exception as exc:
        logger.exception("Meeting notes generation error")
        return _error(str(exc), 500)
