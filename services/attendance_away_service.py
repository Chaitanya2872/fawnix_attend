"""
Attendance Away Alert Service
Sends a push notification when an employee is far from the expected location.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Tuple
import logging

from config import Config
from database.connection import get_db_connection, return_connection
from services.notification_service import get_user_device_tokens, _send_push_to_tokens

logger = logging.getLogger(__name__)


def _normalize_user_id(raw_user_id: Any) -> int:
    try:
        normalized = int(raw_user_id)
    except (TypeError, ValueError):
        raise ValueError("user_id must be a valid integer")

    if normalized <= 0:
        raise ValueError("user_id must be greater than 0")
    return normalized


def _normalize_float(value: Any, label: str) -> float:
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be a valid number")
    return normalized


def _rate_limit_ok(cursor, user_id: int, cooldown_minutes: int) -> Tuple[bool, datetime | None, int | None]:
    cursor.execute(
        """
        SELECT last_sent_at
        FROM attendance_away_alerts
        WHERE user_id = %s
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get("last_sent_at"):
        return True, None, None

    last_sent_at = row["last_sent_at"]
    now = datetime.now()
    elapsed = now - last_sent_at
    if elapsed >= timedelta(minutes=cooldown_minutes):
        return True, last_sent_at, None

    remaining_seconds = int(timedelta(minutes=cooldown_minutes).total_seconds() - elapsed.total_seconds())
    remaining_minutes = max(1, int((remaining_seconds + 59) / 60))
    return False, last_sent_at, remaining_minutes


def _resolve_emp_email(cursor, user_id: int) -> str | None:
    cursor.execute(
        """
        SELECT e.emp_email
        FROM users u
        JOIN employees e ON u.emp_code = e.emp_code
        WHERE u.id = %s
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    return row.get("emp_email") if hasattr(row, "keys") else row[0]


def _has_active_activity(cursor, emp_email: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM activities
        WHERE employee_email = %s AND status = 'active'
        LIMIT 1
        """,
        (emp_email,),
    )
    return cursor.fetchone() is not None


def process_attendance_away_alert(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    data = payload or {}

    try:
        user_id = _normalize_user_id(data.get("user_id"))
        distance_m = _normalize_float(data.get("distance_m"), "distance_m")
        lat = _normalize_float(data.get("lat"), "lat")
        lon = _normalize_float(data.get("lon"), "lon")
    except ValueError as e:
        return ({"sent": 0, "failed": 0, "message": str(e)}, 400)

    timestamp_value = data.get("timestamp")

    if distance_m < 100:
        return (
            {
                "sent": 0,
                "failed": 0,
                "message": "Distance below threshold",
            },
            200,
        )

    cooldown_minutes = max(1, int(getattr(Config, "AWAY_ALERT_COOLDOWN_MINUTES", 5)))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        allowed, _last_sent_at, remaining_minutes = _rate_limit_ok(cursor, user_id, cooldown_minutes)
        if not allowed:
            return (
                {
                    "sent": 0,
                    "failed": 0,
                    "message": f"Rate limit active. Try again in {remaining_minutes} minute(s).",
                },
                200,
            )

        emp_email = _resolve_emp_email(cursor, user_id)
        if not emp_email:
            return ({"sent": 0, "failed": 0, "message": "User not found"}, 404)

        if _has_active_activity(cursor, emp_email):
            return (
                {
                    "sent": 0,
                    "failed": 0,
                    "message": "Active activity in progress. Away alert skipped.",
                },
                200,
            )

        tokens = get_user_device_tokens(user_id)
        if not tokens:
            return (
                {
                    "sent": 0,
                    "failed": 0,
                    "message": "No active device tokens found",
                },
                200,
            )

        title = "Away Alert"
        body = f"You are {distance_m:.0f}m away from your expected location."
        data_payload = {
            "type": "attendance_away",
            "user_id": user_id,
            "distance_m": distance_m,
            "timestamp": timestamp_value,
            "lat": lat,
            "lon": lon,
        }

        send_result = _send_push_to_tokens(
            tokens,
            title,
            body,
            data=data_payload,
            context={"user_id": user_id},
        )

        cursor.execute(
            """
            INSERT INTO attendance_away_alerts (user_id, last_sent_at, created_at, updated_at)
            VALUES (%s, NOW(), NOW(), NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at, updated_at = NOW()
            """,
            (user_id,),
        )
        conn.commit()

        return (
            {
                "sent": int(send_result.get("sent_count", 0)),
                "failed": int(send_result.get("failure_count", 0)),
                "message": send_result.get("message", "Notification processed"),
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Attendance away alert error: %s", e)
        return ({"sent": 0, "failed": 0, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)
