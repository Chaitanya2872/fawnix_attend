"""
Meeting notes generation service.

Supports Gemini directly via uploaded audio, while preserving the existing
OpenAI-compatible fallback when OPENAI_API_KEY is configured instead.
"""

from __future__ import annotations

import base64
from io import BytesIO
import json
import logging
import os
import uuid
from typing import Any, Dict, Tuple

import requests
from werkzeug.datastructures import FileStorage

from config import Config
from database.connection import get_db_connection, return_connection
from services.s3_storage_service import (
    download_s3_object,
    get_s3_configuration_error,
    is_s3_configured,
    upload_meeting_audio,
    upload_meeting_report,
)

logger = logging.getLogger(__name__)

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


def _generate_meeting_note_id() -> str:
    return f"mn_{uuid.uuid4().hex[:16]}"


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
    return {
        "bucket": row.get("audio_bucket"),
        "object_name": row.get("audio_object_name"),
        "file_name": row.get("file_name"),
        "content_type": row.get("content_type") or "application/octet-stream",
        "size_bytes": row.get("audio_size_bytes"),
        "url": row.get("audio_url"),
        "folder": Config.MEETING_NOTES_S3_AUDIO_PREFIX,
        "provider": "s3",
    }


def _row_to_report_storage(row) -> Dict[str, Any] | None:
    if not row.get("report_object_name"):
        return None
    return {
        "bucket": row.get("report_bucket"),
        "object_name": row.get("report_object_name"),
        "file_name": row.get("report_file_name"),
        "content_type": row.get("report_content_type") or "application/pdf",
        "size_bytes": row.get("report_size_bytes"),
        "url": row.get("report_url"),
        "download_url": row.get("report_download_url") or row.get("report_url"),
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
):
    if not Config.FEATURE_MEETING_NOTES:
        return _error("Meeting notes feature is disabled", 503)

    provider = _configured_provider()
    if provider is None:
        return _error(
            "Meeting notes AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY first.",
            503,
        )

    record = _fetch_meeting_note_record(meeting_note_id, emp_code=emp_code)
    if not record:
        return _error("Meeting note not found", 404)

    if not record.get("audio_bucket") or not record.get("audio_object_name"):
        return _error("Uploaded audio is missing for this meeting note", 400)

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
    except requests.RequestException as exc:
        logger.exception("Meeting notes request error")
        return _error(f"Meeting notes provider request failed: {exc}", 502)
    except Exception as exc:
        logger.exception("Meeting notes generation error")
        return _error(str(exc), 500)
