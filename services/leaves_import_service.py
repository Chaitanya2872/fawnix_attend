"""
Leaves Import Service
Bulk import helpers for leave records.
"""

from datetime import date, datetime
from io import StringIO
from typing import Any, Dict, List, Optional, Tuple
import csv
import logging

from database.connection import get_db_connection, return_connection
from services.leaves_service import LEAVE_DURATIONS, calculate_leave_count

logger = logging.getLogger(__name__)

VALID_LEAVE_TYPES = {"casual", "sick", "annual", "monthly"}
VALID_LEAVE_STATUSES = {"pending", "approved", "rejected", "cancelled"}

DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")
DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
)


def parse_leave_csv_rows(csv_content: str) -> List[Dict[str, Any]]:
    """Parse CSV text into leave row dictionaries."""
    raw = (csv_content or "").lstrip("\ufeff").strip()
    if not raw:
        return []

    reader = csv.DictReader(StringIO(raw))
    return [dict(row) for row in reader]


def import_leaves_from_csv(
    csv_content: str,
    default_status: str = "approved",
    strict: bool = False,
    skip_duplicates: bool = True,
) -> Tuple[Dict[str, Any], int]:
    """Parse and import leave rows from CSV content."""
    rows = parse_leave_csv_rows(csv_content)
    return import_leave_rows(
        rows=rows,
        default_status=default_status,
        strict=strict,
        skip_duplicates=skip_duplicates,
    )


def import_leave_rows(
    rows: List[Dict[str, Any]],
    default_status: str = "approved",
    strict: bool = False,
    skip_duplicates: bool = True,
) -> Tuple[Dict[str, Any], int]:
    """
    Import leave rows in bulk.

    Expected row keys (flexible aliases supported):
    - emp_code / employee_code
    - from_date / start_date
    - to_date / end_date
    - leave_type
    Optional:
    - duration, leave_count, notes, status, applied_at, reviewed_by, reviewed_at, remarks
    """
    if not isinstance(rows, list) or not rows:
        return (
            {
                "success": False,
                "message": "No leave rows provided for import",
                "data": {"total_rows": 0, "inserted_count": 0, "skipped_count": 0, "failed_count": 0},
            },
            400,
        )

    normalized_default_status = _normalize_status(default_status, fallback="approved")

    conn = get_db_connection()
    cursor = conn.cursor()

    inserted: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    failed: List[Dict[str, Any]] = []
    employee_cache: Dict[str, Dict[str, Any]] = {}

    try:
        for index, row in enumerate(rows, start=1):
            cursor.execute("SAVEPOINT leave_import_row")
            try:
                normalized = _normalize_leave_row(
                    row=row,
                    row_index=index,
                    cursor=cursor,
                    employee_cache=employee_cache,
                    default_status=normalized_default_status,
                )

                duplicate_id = _find_duplicate_leave(
                    cursor=cursor,
                    emp_code=normalized["emp_code"],
                    from_date=normalized["from_date"],
                    to_date=normalized["to_date"],
                    leave_type=normalized["leave_type"],
                    duration=normalized["duration"],
                )

                if duplicate_id and skip_duplicates:
                    skipped.append(
                        {
                            "row": index,
                            "reason": "Duplicate leave record",
                            "existing_leave_id": duplicate_id,
                        }
                    )
                    cursor.execute("ROLLBACK TO SAVEPOINT leave_import_row")
                    cursor.execute("RELEASE SAVEPOINT leave_import_row")
                    continue

                cursor.execute(
                    """
                    INSERT INTO leaves (
                        emp_code, emp_name, emp_email, manager_code, manager_email,
                        from_date, to_date, leave_type, duration, leave_count, notes,
                        status, applied_at, reviewed_by, reviewed_at, remarks,
                        created_at, updated_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    RETURNING id
                    """,
                    (
                        normalized["emp_code"],
                        normalized["emp_name"],
                        normalized["emp_email"],
                        normalized["manager_code"],
                        normalized["manager_email"],
                        normalized["from_date"],
                        normalized["to_date"],
                        normalized["leave_type"],
                        normalized["duration"],
                        normalized["leave_count"],
                        normalized["notes"],
                        normalized["status"],
                        normalized["applied_at"],
                        normalized["reviewed_by"],
                        normalized["reviewed_at"],
                        normalized["remarks"],
                    ),
                )

                inserted_row = cursor.fetchone() or {}
                inserted.append(
                    {
                        "row": index,
                        "leave_id": inserted_row.get("id") if hasattr(inserted_row, "get") else inserted_row[0],
                        "emp_code": normalized["emp_code"],
                    }
                )
                cursor.execute("RELEASE SAVEPOINT leave_import_row")

            except Exception as row_error:
                cursor.execute("ROLLBACK TO SAVEPOINT leave_import_row")
                cursor.execute("RELEASE SAVEPOINT leave_import_row")
                failed.append({"row": index, "reason": str(row_error)})
                logger.warning("Leave import failed at row %s: %s", index, row_error)

                if strict:
                    conn.rollback()
                    return (
                        {
                            "success": False,
                            "message": "Leave import stopped because strict mode is enabled",
                            "data": {
                                "total_rows": len(rows),
                                "inserted_count": 0,
                                "skipped_count": 0,
                                "failed_count": len(failed),
                                "inserted": [],
                                "skipped": [],
                                "failed": failed,
                            },
                        },
                        400,
                    )

        if inserted:
            conn.commit()
        else:
            conn.rollback()

        success = len(inserted) > 0 and len(failed) == 0
        if inserted and not failed:
            status_code = 201
            message = "Leave records imported successfully"
        elif inserted and failed:
            status_code = 200
            message = "Leave import completed with partial success"
        elif skipped and not failed:
            status_code = 200
            message = "No new leaves imported. All provided rows were duplicates"
        else:
            status_code = 400
            message = "Leave import failed. No rows were imported"

        return (
            {
                "success": success,
                "message": message,
                "data": {
                    "total_rows": len(rows),
                    "inserted_count": len(inserted),
                    "skipped_count": len(skipped),
                    "failed_count": len(failed),
                    "inserted": inserted,
                    "skipped": skipped,
                    "failed": failed,
                },
            },
            status_code,
        )

    except Exception as exc:
        conn.rollback()
        logger.exception("Leave import transaction failed: %s", exc)
        return (
            {
                "success": False,
                "message": f"Unexpected import error: {exc}",
                "data": {
                    "total_rows": len(rows),
                    "inserted_count": 0,
                    "skipped_count": 0,
                    "failed_count": len(rows),
                },
            },
            500,
        )
    finally:
        cursor.close()
        return_connection(conn)


def _normalize_leave_row(
    row: Dict[str, Any],
    row_index: int,
    cursor,
    employee_cache: Dict[str, Dict[str, Any]],
    default_status: str,
) -> Dict[str, Any]:
    """Normalize and validate one import row."""
    if not isinstance(row, dict):
        raise ValueError(f"Row {row_index}: invalid row format")

    emp_code = _required_string(row, ("emp_code", "employee_code"), "emp_code", row_index)
    employee = _get_employee_snapshot(cursor, emp_code, employee_cache)
    if not employee:
        raise ValueError(f"Row {row_index}: employee not found for emp_code '{emp_code}'")

    from_date = _parse_date(_first_present(row, ("from_date", "start_date", "leave_from")), "from_date", row_index)
    to_date = _parse_date(_first_present(row, ("to_date", "end_date", "leave_to")), "to_date", row_index)
    if to_date < from_date:
        raise ValueError(f"Row {row_index}: to_date must be on or after from_date")

    leave_type = _normalize_leave_type(
        _required_string(row, ("leave_type",), "leave_type", row_index),
        row_index,
    )
    duration = _normalize_duration(_first_present(row, ("duration",), default="full_day"), row_index)
    if duration in {"first_half", "second_half"} and from_date != to_date:
        raise ValueError(f"Row {row_index}: half-day leave must have same from_date and to_date")

    leave_count = _parse_leave_count(_first_present(row, ("leave_count", "days", "no_of_days")))
    if leave_count is None:
        leave_count = float(calculate_leave_count(from_date, to_date, duration, from_date.year))
    if leave_count <= 0:
        raise ValueError(f"Row {row_index}: leave_count must be greater than 0")

    manager_code = _clean_string(_first_present(row, ("manager_code",), default=employee.get("manager_code")))
    manager_email = _clean_string(_first_present(row, ("manager_email",), default=employee.get("manager_email")))

    status = _normalize_status(_first_present(row, ("status",), default=default_status), fallback=default_status)
    applied_at = _parse_datetime(
        _first_present(row, ("applied_at", "applied_on", "created_at")),
        "applied_at",
        row_index,
        required=False,
    ) or datetime.utcnow()

    reviewed_by = _clean_string(_first_present(row, ("reviewed_by", "approved_by")))
    reviewed_at = _parse_datetime(
        _first_present(row, ("reviewed_at", "approved_at")),
        "reviewed_at",
        row_index,
        required=False,
    )

    if status != "pending" and not reviewed_at:
        reviewed_at = applied_at
    if status != "pending" and not reviewed_by:
        reviewed_by = manager_code or None

    return {
        "emp_code": emp_code,
        "emp_name": _clean_string(_first_present(row, ("emp_name", "employee_name"), default=employee["emp_name"])),
        "emp_email": _clean_string(_first_present(row, ("emp_email", "employee_email"), default=employee["emp_email"])),
        "manager_code": manager_code or None,
        "manager_email": manager_email or None,
        "from_date": from_date,
        "to_date": to_date,
        "leave_type": leave_type,
        "duration": duration,
        "leave_count": leave_count,
        "notes": _clean_string(_first_present(row, ("notes", "reason"))),
        "status": status,
        "applied_at": applied_at,
        "reviewed_by": reviewed_by or None,
        "reviewed_at": reviewed_at,
        "remarks": _clean_string(_first_present(row, ("remarks", "review_notes"))) or None,
    }


def _get_employee_snapshot(cursor, emp_code: str, employee_cache: Dict[str, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Fetch employee details once per employee code."""
    if emp_code in employee_cache:
        return employee_cache[emp_code]

    cursor.execute(
        """
        SELECT
            e.emp_code,
            e.emp_full_name,
            e.emp_email,
            e.emp_manager,
            m.emp_email AS manager_email
        FROM employees e
        LEFT JOIN employees m ON m.emp_code = e.emp_manager
        WHERE e.emp_code = %s
        """,
        (emp_code,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    snapshot = {
        "emp_code": _clean_string(row.get("emp_code")),
        "emp_name": _clean_string(row.get("emp_full_name")),
        "emp_email": _clean_string(row.get("emp_email")),
        "manager_code": _clean_string(row.get("emp_manager")) or None,
        "manager_email": _clean_string(row.get("manager_email")) or None,
    }
    employee_cache[emp_code] = snapshot
    return snapshot


def _find_duplicate_leave(
    cursor,
    emp_code: str,
    from_date: date,
    to_date: date,
    leave_type: str,
    duration: str,
) -> Optional[int]:
    """Find a duplicate leave record based on core leave identity fields."""
    cursor.execute(
        """
        SELECT id
        FROM leaves
        WHERE emp_code = %s
          AND from_date = %s
          AND to_date = %s
          AND leave_type = %s
          AND duration = %s
        LIMIT 1
        """,
        (emp_code, from_date, to_date, leave_type, duration),
    )
    row = cursor.fetchone()
    if not row:
        return None
    return row.get("id") if hasattr(row, "get") else row[0]


def _first_present(row: Dict[str, Any], keys: Tuple[str, ...], default: Any = None) -> Any:
    for key in keys:
        if key in row and row[key] is not None and str(row[key]).strip() != "":
            return row[key]
    return default


def _required_string(row: Dict[str, Any], keys: Tuple[str, ...], field_name: str, row_index: int) -> str:
    value = _first_present(row, keys)
    text = _clean_string(value)
    if not text:
        raise ValueError(f"Row {row_index}: '{field_name}' is required")
    return text


def _clean_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _parse_date(value: Any, field_name: str, row_index: int) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    text = _clean_string(value)
    if not text:
        raise ValueError(f"Row {row_index}: '{field_name}' is required")

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue


    raise ValueError(f"Row {row_index}: invalid '{field_name}' format. Use YYYY-MM-DD or DD-MM-YYYY")


def _parse_datetime(value: Any, field_name: str, row_index: int, required: bool = True) -> Optional[datetime]:
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise ValueError(f"Row {row_index}: '{field_name}' is required")
        return None

    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    text = _clean_string(value)
    if not text:
        if required:
            raise ValueError(f"Row {row_index}: '{field_name}' is required")
        return None

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=None)
    except ValueError:
        pass

    for fmt in DATETIME_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    raise ValueError(f"Row {row_index}: invalid '{field_name}' datetime format")


def _parse_leave_count(value: Any) -> Optional[float]:
    if value is None:
        return None

    text = _clean_string(value)
    if not text:
        return None

    try:
        return round(float(text), 1)
    except (TypeError, ValueError):
        raise ValueError("Invalid leave_count value")


def _normalize_leave_type(value: str, row_index: int) -> str:
    raw = _clean_string(value).lower()
    alias_map = {
        "cl": "casual",
        "casual leave": "casual",
        "sl": "sick",
        "sick leave": "sick",
        "al": "annual",
        "annual leave": "annual",
        "ml": "monthly",
        "monthly leave": "monthly",
    }
    normalized = alias_map.get(raw, raw)
    if normalized not in VALID_LEAVE_TYPES:
        valid_values = ", ".join(sorted(VALID_LEAVE_TYPES))
        raise ValueError(f"Row {row_index}: invalid leave_type '{value}'. Allowed: {valid_values}")
    return normalized


def _normalize_duration(value: Any, row_index: int) -> str:
    raw = _clean_string(value).lower().replace("-", "_").replace(" ", "_")
    alias_map = {
        "fullday": "full_day",
        "full_day": "full_day",
        "firsthalf": "first_half",
        "first_half": "first_half",
        "secondhalf": "second_half",
        "second_half": "second_half",
    }
    normalized = alias_map.get(raw, raw)
    if normalized not in LEAVE_DURATIONS:
        valid_values = ", ".join(LEAVE_DURATIONS)
        raise ValueError(f"Row {row_index}: invalid duration '{value}'. Allowed: {valid_values}")
    return normalized


def _normalize_status(value: Any, fallback: str = "approved") -> str:
    status = _clean_string(value).lower() or fallback
    if status not in VALID_LEAVE_STATUSES:
        valid_values = ", ".join(sorted(VALID_LEAVE_STATUSES))
        raise ValueError(f"Invalid status '{value}'. Allowed: {valid_values}")
    return status
