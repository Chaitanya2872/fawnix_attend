"""
Meeting notes generation service.

Supports Gemini directly via uploaded audio, while preserving the existing
OpenAI-compatible fallback when OPENAI_API_KEY is configured instead.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, Tuple

import requests

from config import Config

logger = logging.getLogger(__name__)


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


def _meeting_prompt(meeting_title: str | None = None, language: str | None = None) -> str:
    title_text = (meeting_title or "").strip() or "Untitled meeting"
    language_text = (language or "").strip() or "auto-detect from the audio"
    return (
        "Listen to the uploaded meeting audio and return strict JSON with this exact shape:\n"
        "{\n"
        '  "transcript": "clean transcript of the meeting audio",\n'
        '  "summary": "short executive summary",\n'
        '  "minutes_of_meeting": "well-formatted MOM with sections such as overview, discussion, decisions, and action items",\n'
        '  "important_points": ["point 1", "point 2", "point 3"]\n'
        "}\n"
        "Rules:\n"
        "- Return valid JSON only.\n"
        "- Keep transcript readable and cleaned up.\n"
        "- Keep summary concise.\n"
        "- Keep minutes_of_meeting detailed and structured.\n"
        "- important_points must be an array of short bullet-style strings.\n"
        "- If some speech is unclear, mention that briefly inside the transcript or minutes where needed.\n"
        f"- Meeting title: {title_text}\n"
        f"- Preferred language handling: {language_text}\n"
    )


def _build_openai_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {Config.OPENAI_API_KEY}"}


def _generate_notes_with_openai(audio_file, meeting_title: str | None = None, language: str | None = None) -> Dict[str, Any]:
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

    completion_url = f"{Config.OPENAI_BASE_URL}/chat/completions"
    completion_payload = {
        "model": Config.MEETING_NOTES_COMPLETION_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "Return only valid JSON."},
            {
                "role": "user",
                "content": (
                    "Convert the transcript below into strict JSON with this exact shape:\n"
                    "{\n"
                    '  "summary": "short executive summary",\n'
                    '  "minutes_of_meeting": "well-formatted MOM with sections such as overview, discussion, decisions, and action items",\n'
                    '  "important_points": ["point 1", "point 2", "point 3"]\n'
                    "}\n"
                    f"Meeting title: {(meeting_title or '').strip() or 'Untitled meeting'}\n\n"
                    f"Transcript:\n{transcript}"
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
    audio_bytes = _read_audio_bytes(audio_file)
    mime_type = audio_file.mimetype or "application/octet-stream"
    encoded_audio = base64.b64encode(audio_bytes).decode("ascii")
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
                    {"text": _meeting_prompt(meeting_title=meeting_title, language=language)},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": encoded_audio,
                        }
                    },
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

    payload = response.json()
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini meeting notes generation returned no candidates")

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    raw_text = "".join(str(part.get("text") or "") for part in parts).strip()
    if not raw_text:
        raise RuntimeError("Gemini meeting notes generation returned empty content")

    return _parse_structured_notes(raw_text)


def _configured_provider() -> str | None:
    if Config.GEMINI_API_KEY:
        return "gemini"
    if Config.OPENAI_API_KEY:
        return "openai"
    return None


def generate_meeting_notes(audio_file, meeting_title: str | None = None, language: str | None = None):
    """Generate meeting outputs from an uploaded audio file."""
    if not Config.FEATURE_MEETING_NOTES:
        return _error("Meeting notes feature is disabled", 503)

    provider = _configured_provider()
    if provider is None:
        return _error(
            "Meeting notes AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY first.",
            503,
        )

    is_valid, validation_message = _validate_audio_file(audio_file)
    if not is_valid:
        return _error(validation_message or "Invalid audio file", 400)

    filename = (audio_file.filename or "").strip()

    try:
        audio_file.stream.seek(0, os.SEEK_END)
        file_size = audio_file.stream.tell()
        audio_file.stream.seek(0)
    except Exception:
        file_size = None

    max_bytes = Config.MEETING_NOTES_MAX_UPLOAD_MB * 1024 * 1024
    if file_size is not None and file_size > max_bytes:
        return _error(
            f"Audio file is too large. Maximum allowed size is {Config.MEETING_NOTES_MAX_UPLOAD_MB} MB.",
            400,
        )

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
                },
            },
            200,
        )
    except requests.RequestException as exc:
        logger.exception("Meeting notes request error")
        return _error(f"Meeting notes provider request failed: {exc}", 502)
    except Exception as exc:
        logger.exception("Meeting notes generation error")
        return _error(str(exc), 500)

