"""
MinIO storage helpers for meeting-notes audio.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
import logging
import re
from typing import Any, Dict
import uuid

from config import Config

logger = logging.getLogger(__name__)

try:
    from minio import Minio
except ImportError:  # pragma: no cover - optional dependency
    Minio = None


def is_minio_configured() -> bool:
    """Return True when MinIO credentials and client support are available."""
    return bool(
        Minio is not None
        and Config.MINIO_ENDPOINT
        and Config.MINIO_ACCESS_KEY
        and Config.MINIO_SECRET_KEY
        and Config.MINIO_BUCKET
    )


def _build_minio_client():
    if Minio is None:
        raise RuntimeError("minio package is not installed")

    return Minio(
        Config.MINIO_ENDPOINT,
        access_key=Config.MINIO_ACCESS_KEY,
        secret_key=Config.MINIO_SECRET_KEY,
        secure=Config.MINIO_SECURE,
    )


def _safe_slug(value: str | None, fallback: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return fallback
    cleaned = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return cleaned[:80] or fallback


def upload_meeting_audio(
    audio_bytes: bytes,
    filename: str,
    *,
    content_type: str | None = None,
    emp_code: str | None = None,
    meeting_title: str | None = None,
) -> Dict[str, Any]:
    """Upload meeting audio bytes to MinIO and return object metadata."""
    if not is_minio_configured():
        raise RuntimeError("MinIO is not configured")

    original_filename = (filename or "").strip() or "meeting-audio"
    extension = ""
    if "." in original_filename:
        extension = "." + original_filename.rsplit(".", 1)[-1].strip().lower()

    timestamp = datetime.utcnow()
    object_name = (
        f"{Config.MINIO_MEETING_AUDIO_PREFIX}/{timestamp.strftime('%Y/%m/%d')}/"
        f"{_safe_slug(emp_code, 'unknown-employee')}/"
        f"{_safe_slug(meeting_title, 'meeting')}-{uuid.uuid4().hex}{extension}"
    )

    client = _build_minio_client()
    bucket_name = Config.MINIO_BUCKET

    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)

    client.put_object(
        bucket_name,
        object_name,
        BytesIO(audio_bytes),
        length=len(audio_bytes),
        content_type=content_type or "application/octet-stream",
    )

    protocol = "https" if Config.MINIO_SECURE else "http"
    return {
        "bucket": bucket_name,
        "object_name": object_name,
        "file_name": original_filename,
        "content_type": content_type or "application/octet-stream",
        "size_bytes": len(audio_bytes),
        "url": f"{protocol}://{Config.MINIO_ENDPOINT}/{bucket_name}/{object_name}",
    }
