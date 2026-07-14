"""
API Log Service
Persists and queries sanitized request/response records for every API call
handled by the backend, so admins can inspect server-side traffic by method,
status, employee, and date range.
"""

import logging
from datetime import date, datetime
from typing import Dict, List, Optional

from psycopg2.extras import Json

from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

_SENSITIVE_KEY_MARKERS = ("authorization", "token", "password", "otp", "secret")
_MAX_STRING_LENGTH = 600
_MAX_DICT_KEYS = 50
_MAX_LIST_ITEMS = 25

# Soft retention cap: prune older rows once the table grows past this size so
# the log never grows unbounded. Pruning runs occasionally (not every insert)
# to keep the hot path cheap.
_RETENTION_MAX_ROWS = 20000
_PRUNE_EVERY_N_INSERTS = 200
_insert_counter = 0


def _is_sensitive_key(key: str) -> bool:
    normalized = (key or "").strip().lower()
    return any(marker in normalized for marker in _SENSITIVE_KEY_MARKERS)


def sanitize_payload(value):
    """Recursively redact sensitive fields and cap payload size for storage."""
    if value is None:
        return None

    if isinstance(value, dict):
        sanitized = {}
        for key, entry in list(value.items())[:_MAX_DICT_KEYS]:
            if _is_sensitive_key(str(key)):
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = sanitize_payload(entry)
        return sanitized

    if isinstance(value, (list, tuple)):
        return [sanitize_payload(item) for item in list(value)[:_MAX_LIST_ITEMS]]

    if isinstance(value, str):
        if len(value) > _MAX_STRING_LENGTH:
            return f"{value[:_MAX_STRING_LENGTH]}..."
        return value

    if isinstance(value, (int, float, bool)):
        return value

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return str(value)


def _maybe_prune_old_rows(cursor):
    global _insert_counter
    _insert_counter += 1
    if _insert_counter % _PRUNE_EVERY_N_INSERTS != 0:
        return

    cursor.execute(
        """
        DELETE FROM api_logs
        WHERE id IN (
            SELECT id FROM api_logs
            ORDER BY id DESC
            OFFSET %s
        )
        """,
        (_RETENTION_MAX_ROWS,),
    )


def record_api_log(
    *,
    method: str,
    path: str,
    status_code: Optional[int],
    duration_ms: Optional[int],
    emp_code: Optional[str],
    remote_addr: Optional[str],
    request_payload=None,
    response_payload=None,
) -> None:
    """Best-effort insert of a sanitized API log row. Never raises."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO api_logs (
                method, path, status_code, duration_ms, emp_code, remote_addr,
                request_payload, response_payload
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                (method or "")[:10],
                (path or "")[:500],
                status_code,
                duration_ms,
                (emp_code or None),
                (remote_addr or None)[:64] if remote_addr else None,
                Json(sanitize_payload(request_payload)) if request_payload is not None else None,
                Json(sanitize_payload(response_payload)) if response_payload is not None else None,
            ),
        )
        _maybe_prune_old_rows(cursor)
        conn.commit()
    except Exception as exc:  # pragma: no cover - logging must never break a request
        logger.warning("Failed to record API log: %s", exc)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)


def get_api_logs(
    *,
    page: int = 1,
    page_size: int = 25,
    method: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    from_date=None,
    to_date=None,
) -> Dict:
    """Fetch paginated, filtered API log rows."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        normalized_page = max(int(page or 1), 1)
        normalized_page_size = min(max(int(page_size or 25), 1), 200)
        offset = (normalized_page - 1) * normalized_page_size

        base_query = "FROM api_logs WHERE 1=1"
        params: List[object] = []

        normalized_method = (method or "").strip().upper()
        if normalized_method:
            base_query += " AND method = %s"
            params.append(normalized_method)

        normalized_status = (status or "").strip().lower()
        if normalized_status == "success":
            base_query += " AND status_code BETWEEN 200 AND 399"
        elif normalized_status == "error":
            base_query += " AND status_code >= 400"

        normalized_search = (search or "").strip()
        if normalized_search:
            like_value = f"%{normalized_search}%"
            base_query += " AND (path ILIKE %s OR emp_code ILIKE %s)"
            params.extend([like_value, like_value])

        if from_date:
            base_query += " AND created_at >= %s"
            params.append(from_date)

        if to_date:
            base_query += " AND created_at < (%s::date + INTERVAL '1 day')"
            params.append(to_date)

        cursor.execute(f"SELECT COUNT(*) AS total_records {base_query}", params)
        total_records = int(cursor.fetchone().get("total_records") or 0)

        query = f"""
            SELECT id, method, path, status_code, duration_ms, emp_code,
                   remote_addr, request_payload, response_payload, created_at
            {base_query}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, [*params, normalized_page_size, offset])
        rows = cursor.fetchall()

        records = []
        for row in rows:
            record = dict(row)
            if record.get("created_at"):
                record["created_at"] = record["created_at"].isoformat()
            records.append(record)

        total_pages = (
            (total_records + normalized_page_size - 1) // normalized_page_size
            if total_records
            else 0
        )

        return {
            "records": records,
            "pagination": {
                "page": normalized_page,
                "page_size": normalized_page_size,
                "total_records": total_records,
                "total_pages": total_pages,
                "has_next": normalized_page < total_pages,
                "has_previous": normalized_page > 1 and total_pages > 0,
            },
        }
    finally:
        cursor.close()
        return_connection(conn)
