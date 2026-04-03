"""
Attendance Notification Service
FCM push notifications for attendance tracking state transitions.
"""

from datetime import datetime
from typing import Any, Dict, Tuple
import logging

from database.connection import get_db_connection, return_connection
from services.fcm_service import send_to_user_tokens
from utils.time_utils import now_local_naive

logger = logging.getLogger(__name__)

EVENT_DEFINITIONS = {
    "tracking_started": {
        "title": "Attendance tracking active",
        "body": "Location tracking is running for working hours.",
        "status": "active",
    },
    "working_hours_paused": {
        "title": "Working hours paused",
        "body": "You are outside the allowed work radius. Return to resume.",
        "status": "paused",
    },
    "working_hours_resumed": {
        "title": "Working hours resumed",
        "body": "Back within work area. Working hours resumed.",
        "status": "active",
    },
    "tracking_stopped": {
        "title": "Attendance tracking stopped",
        "body": "Location tracking has stopped.",
        "status": "stopped",
    },
}


def _normalized_attendance_id(attendance_id: Any) -> int:
    value = int(attendance_id)
    if value <= 0:
        raise ValueError("attendance_id must be greater than 0")
    return value


def _normalized_emp_code(emp_code: Any) -> str:
    value = (emp_code or "").strip()
    if not value:
        raise ValueError("employee_id is required")
    return value


def _get_state(cursor, attendance_id: int):
    cursor.execute(
        """
        SELECT *
        FROM attendance_tracking_notification_state
        WHERE attendance_id = %s
        """,
        (attendance_id,),
    )
    return cursor.fetchone()


def _create_state(cursor, attendance_id: int, emp_code: str):
    cursor.execute(
        """
        INSERT INTO attendance_tracking_notification_state (
            attendance_id,
            emp_code,
            current_status,
            created_at,
            updated_at
        ) VALUES (%s, %s, 'unknown', NOW(), NOW())
        RETURNING *
        """,
        (attendance_id, emp_code),
    )
    return cursor.fetchone()


def _get_or_create_state(cursor, attendance_id: int, emp_code: str):
    row = _get_state(cursor, attendance_id)
    if row:
        return row
    return _create_state(cursor, attendance_id, emp_code)


def _transition_allowed(event_type: str, state: Dict[str, Any]) -> Tuple[bool, str]:
    current_status = (state.get("current_status") or "unknown").strip().lower()

    if event_type == "tracking_started":
        return (state.get("started_notified_at") is None, "tracking already started")

    if event_type == "working_hours_paused":
        if state.get("stopped_notified_at"):
            return (False, "tracking already stopped")
        if current_status == "paused":
            return (False, "working hours already paused")
        return (True, "")

    if event_type == "working_hours_resumed":
        if state.get("stopped_notified_at"):
            return (False, "tracking already stopped")
        if current_status != "paused":
            return (False, "working hours not paused")
        return (True, "")

    if event_type == "tracking_stopped":
        return (state.get("stopped_notified_at") is None, "tracking already stopped")

    return (False, "unsupported event type")


def _apply_transition(cursor, attendance_id: int, event_type: str, event_time: datetime):
    event_column = {
        "tracking_started": "started_notified_at",
        "working_hours_paused": "paused_notified_at",
        "working_hours_resumed": "resumed_notified_at",
        "tracking_stopped": "stopped_notified_at",
    }[event_type]

    next_status = EVENT_DEFINITIONS[event_type]["status"]
    cursor.execute(
        f"""
        UPDATE attendance_tracking_notification_state
        SET
            current_status = %s,
            {event_column} = %s,
            updated_at = %s
        WHERE attendance_id = %s
        """,
        (next_status, event_time, event_time, attendance_id),
    )


def _build_payload(event_type: str, emp_code: str, attendance_id: int, event_time: datetime) -> Dict[str, str]:
    return {
        "type": event_type,
        "employee_id": emp_code,
        "attendance_id": attendance_id,
        "status": EVENT_DEFINITIONS[event_type]["status"],
        "timestamp": event_time.isoformat(),
    }


def _notify_event(event_type: str, employee_id: Any, attendance_id: Any) -> Dict[str, Any]:
    if event_type not in EVENT_DEFINITIONS:
        raise ValueError(f"Unsupported event type: {event_type}")

    normalized_emp_code = _normalized_emp_code(employee_id)
    normalized_attendance_id = _normalized_attendance_id(attendance_id)
    event_time = now_local_naive()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        state = _get_or_create_state(cursor, normalized_attendance_id, normalized_emp_code)
        allowed, reason = _transition_allowed(event_type, state)

        if not allowed:
            logger.info(
                "Skipping attendance tracking push | event=%s employee_id=%s attendance_id=%s reason=%s",
                event_type,
                normalized_emp_code,
                normalized_attendance_id,
                reason,
            )
            conn.rollback()
            return {
                "success": False,
                "message": reason,
                "event_type": event_type,
                "employee_id": normalized_emp_code,
                "attendance_id": normalized_attendance_id,
                "token_count": 0,
                "sent_count": 0,
                "failure_count": 0,
                "skipped": True,
            }

        _apply_transition(cursor, normalized_attendance_id, event_type, event_time)
        conn.commit()

        payload = _build_payload(event_type, normalized_emp_code, normalized_attendance_id, event_time)
        definition = EVENT_DEFINITIONS[event_type]
        send_result = send_to_user_tokens(
            normalized_emp_code,
            definition["title"],
            definition["body"],
            payload,
        )

        logger.info(
            "Attendance tracking push processed | event=%s employee_id=%s attendance_id=%s token_count=%s sent=%s failed=%s success=%s",
            event_type,
            normalized_emp_code,
            normalized_attendance_id,
            send_result.get("token_count", 0),
            send_result.get("sent_count", 0),
            send_result.get("failure_count", 0),
            send_result.get("success", False),
        )

        send_result.update(
            {
                "event_type": event_type,
                "employee_id": normalized_emp_code,
                "attendance_id": normalized_attendance_id,
                "payload": payload,
            }
        )
        return send_result
    except Exception:
        conn.rollback()
        logger.exception(
            "Attendance tracking push failed | event=%s employee_id=%s attendance_id=%s",
            event_type,
            normalized_emp_code,
            normalized_attendance_id,
        )
        raise
    finally:
        cursor.close()
        return_connection(conn)


def notify_tracking_started(employee_id: Any, attendance_id: Any) -> Dict[str, Any]:
    return _notify_event("tracking_started", employee_id, attendance_id)


def notify_working_hours_paused(employee_id: Any, attendance_id: Any) -> Dict[str, Any]:
    return _notify_event("working_hours_paused", employee_id, attendance_id)


def notify_working_hours_resumed(employee_id: Any, attendance_id: Any) -> Dict[str, Any]:
    return _notify_event("working_hours_resumed", employee_id, attendance_id)


def notify_tracking_stopped(employee_id: Any, attendance_id: Any) -> Dict[str, Any]:
    return _notify_event("tracking_stopped", employee_id, attendance_id)
