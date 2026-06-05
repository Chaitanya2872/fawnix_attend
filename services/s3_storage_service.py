"""
AWS S3 storage helpers for meeting-notes assets.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
import json
import logging
import re
from typing import Any, Dict
import uuid

from config import Config

logger = logging.getLogger(__name__)

try:
    import boto3
except ImportError:  # pragma: no cover - optional dependency
    boto3 = None


def is_s3_configured() -> bool:
    """Return True when S3 credentials are available."""
    return bool(
        boto3 is not None
        and Config.MEETING_NOTES_S3_BUCKET
        and Config.MEETING_NOTES_AWS_ACCESS_KEY_ID
        and Config.MEETING_NOTES_AWS_SECRET_ACCESS_KEY
        and Config.MEETING_NOTES_S3_REGION
    )


def _build_s3_client():
    if boto3 is None:
        raise RuntimeError("boto3 package is not installed")

    return boto3.client(
        "s3",
        region_name=Config.MEETING_NOTES_S3_REGION,
        aws_access_key_id=Config.MEETING_NOTES_AWS_ACCESS_KEY_ID,
        aws_secret_access_key=Config.MEETING_NOTES_AWS_SECRET_ACCESS_KEY,
    )


def _safe_slug(value: str | None, fallback: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return fallback
    cleaned = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return cleaned[:80] or fallback


def _build_object_name(prefix: str, filename: str, emp_code: str | None, meeting_title: str | None) -> str:
    original_filename = (filename or "").strip() or "meeting-file"
    extension = ""
    if "." in original_filename:
        extension = "." + original_filename.rsplit(".", 1)[-1].strip().lower()

    timestamp = datetime.utcnow()
    return (
        f"{prefix}/{timestamp.strftime('%Y/%m/%d')}/"
        f"{_safe_slug(emp_code, 'unknown-employee')}/"
        f"{_safe_slug(meeting_title, 'meeting')}-{uuid.uuid4().hex}{extension}"
    )


def _public_url(bucket_name: str, object_name: str) -> str:
    region = Config.MEETING_NOTES_S3_REGION
    return f"https://{bucket_name}.s3.{region}.amazonaws.com/{object_name}"


def upload_meeting_audio(
    audio_bytes: bytes,
    filename: str,
    *,
    content_type: str | None = None,
    emp_code: str | None = None,
    meeting_title: str | None = None,
) -> Dict[str, Any]:
    """Upload meeting audio bytes to S3 and return object metadata."""
    if not is_s3_configured():
        raise RuntimeError("S3 is not configured")

    bucket_name = Config.MEETING_NOTES_S3_BUCKET
    object_name = _build_object_name(
        Config.MEETING_NOTES_S3_AUDIO_PREFIX,
        filename,
        emp_code,
        meeting_title,
    )
    client = _build_s3_client()
    client.upload_fileobj(
        Fileobj=BytesIO(audio_bytes),
        Bucket=bucket_name,
        Key=object_name,
        ExtraArgs={"ContentType": content_type or "application/octet-stream"},
    )

    return {
        "bucket": bucket_name,
        "object_name": object_name,
        "file_name": (filename or "").strip() or "meeting-audio",
        "content_type": content_type or "application/octet-stream",
        "size_bytes": len(audio_bytes),
        "url": _public_url(bucket_name, object_name),
        "folder": Config.MEETING_NOTES_S3_AUDIO_PREFIX,
        "provider": "s3",
    }


def upload_meeting_report(
    report_payload: Dict[str, Any],
    *,
    emp_code: str | None = None,
    meeting_title: str | None = None,
) -> Dict[str, Any]:
    """Upload generated meeting report JSON to S3 and return object metadata."""
    if not is_s3_configured():
        raise RuntimeError("S3 is not configured")

    report_filename = f"{_safe_slug(meeting_title, 'meeting-report')}.json"
    object_name = _build_object_name(
        Config.MEETING_NOTES_S3_REPORT_PREFIX,
        report_filename,
        emp_code,
        meeting_title,
    )
    report_bytes = json.dumps(report_payload, ensure_ascii=True, indent=2).encode("utf-8")
    bucket_name = Config.MEETING_NOTES_S3_BUCKET
    client = _build_s3_client()
    client.upload_fileobj(
        Fileobj=BytesIO(report_bytes),
        Bucket=bucket_name,
        Key=object_name,
        ExtraArgs={"ContentType": "application/json"},
    )

    return {
        "bucket": bucket_name,
        "object_name": object_name,
        "file_name": report_filename,
        "content_type": "application/json",
        "size_bytes": len(report_bytes),
        "url": _public_url(bucket_name, object_name),
        "folder": Config.MEETING_NOTES_S3_REPORT_PREFIX,
        "provider": "s3",
    }
