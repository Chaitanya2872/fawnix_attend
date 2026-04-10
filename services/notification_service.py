"""
Notification Service
Handles FCM device token registration and push notification delivery.
"""

import json
import logging
import os
from datetime import date, datetime, time
from typing import Any, Dict, List

from config import Config
from database.connection import get_db_connection, return_connection
from services.CompLeaveService import is_working_day
from utils.time_utils import now_local_naive

logger = logging.getLogger(__name__)

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except ImportError:  # pragma: no cover - optional dependency
    firebase_admin = None
    credentials = None
    messaging = None


FCM_BATCH_SIZE = 500
INVALID_TOKEN_ERROR_NAMES = {
    "InvalidArgumentError",
    "SenderIdMismatchError",
    "UnregisteredError",
}
_firebase_app = None
_firebase_init_attempted = False


def _serialize_value(value: Any) -> Any:
    """Convert datetime-like values to strings for API responses."""
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    return value


def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a RealDictCursor row."""
    return {key: _serialize_value(value) for key, value in row.items()}


def _sanitize_device_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Return response-safe device metadata without exposing the raw FCM token."""
    serialized = _serialize_row(row)
    serialized.pop("fcm_token", None)
    return serialized


def _normalize_user_id(user_id: Any) -> int:
    """Validate and normalize incoming user_id values."""
    try:
        normalized = int(user_id)
    except (TypeError, ValueError):
        raise ValueError("user_id must be a valid integer")

    if normalized <= 0:
        raise ValueError("user_id must be greater than 0")

    return normalized


def _normalize_emp_code(emp_code: Any) -> str:
    """Normalize employee codes used across the existing codebase."""
    normalized = (emp_code or "").strip()
    if not normalized:
        raise ValueError("emp_code is required")
    return normalized


def _normalize_platform(platform: Any) -> str:
    """Normalize platform value for storage."""
    normalized = (platform or "android").strip().lower()
    return normalized[:20] if normalized else "android"


def _normalize_device_name(device_name: Any) -> str | None:
    """Normalize device name for storage."""
    value = (device_name or "").strip()
    if not value:
        return None
    return value[:100]


def _normalize_data_payload(data: Dict[str, Any] | None) -> Dict[str, str] | None:
    """FCM data payload requires string key/value pairs."""
    if not data:
        return None

    normalized: Dict[str, str] = {}
    for key, value in data.items():
        if value is None:
            continue

        if isinstance(value, (dict, list, tuple)):
            normalized[str(key)] = json.dumps(value)
        else:
            normalized[str(key)] = str(value)

    return normalized or None


def _chunked(items: List[str], size: int) -> List[List[str]]:
    """Split a list into FCM-sized chunks."""
    return [items[index:index + size] for index in range(0, len(items), size)]


def _scheduled_datetime_for(reminder_date: date, raw_time: str | None) -> datetime | None:
    """Build a naive local scheduled datetime from an HH:MM string."""
    value = (raw_time or "").strip()
    if not value:
        return None

    try:
        hour, minute = [int(part) for part in value.split(":", 1)]
    except (TypeError, ValueError):
        return None

    return datetime.combine(reminder_date, time(hour=hour, minute=minute))


def _log_scheduled_notification_attempt(
    notification_type: str,
    emp_code: str,
    title: str,
    body: str,
    scheduled_for: datetime | None,
    send_result: Dict[str, Any],
) -> None:
    """Persist audit data for scheduled push notification attempts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        delivery_status = "sent" if send_result.get("success") else "failed"
        sent_at = now_local_naive() if send_result.get("success") else None
        failure_message = None if send_result.get("success") else send_result.get("message")

        cursor.execute(
            """
            INSERT INTO scheduled_notification_logs (
                notification_type,
                emp_code,
                title,
                body,
                scheduled_for,
                delivery_status,
                sent_at,
                failure_message,
                response_payload,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW(), NOW())
            """,
            (
                notification_type,
                emp_code,
                title,
                body,
                scheduled_for,
                delivery_status,
                sent_at,
                failure_message,
                json.dumps(send_result, default=_serialize_value),
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        logger.exception(
            "Scheduled notification log insert failed | type=%s emp_code=%s",
            notification_type,
            emp_code,
        )
    finally:
        cursor.close()
        return_connection(conn)


def _get_firebase_app():
    """Initialize and cache the Firebase Admin app when configured."""
    global _firebase_app, _firebase_init_attempted

    if _firebase_app is not None:
        return _firebase_app

    if _firebase_init_attempted:
        return None

    _firebase_init_attempted = True

    if not Config.FEATURE_PUSH_NOTIFICATIONS:
        logger.info("Push notifications are disabled by configuration")
        return None

    if firebase_admin is None or messaging is None:
        logger.warning("firebase-admin is not installed; push notifications are running in placeholder mode")
        return None

    try:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        pass

    credential_path = (Config.FIREBASE_SERVICE_ACCOUNT_PATH or "").strip()

    try:
        if credential_path:
            if not os.path.isfile(credential_path):
                logger.warning(
                    "Firebase service account file not found at '%s'; push notifications are running in placeholder mode",
                    credential_path,
                )
                return None

            _firebase_app = firebase_admin.initialize_app(
                credentials.Certificate(credential_path)
            )
        else:
            _firebase_app = firebase_admin.initialize_app()

        logger.info("Firebase Admin initialized successfully")
        return _firebase_app
    except Exception as e:
        logger.error("Firebase initialization error: %s", e)
        return None


def _deactivate_tokens(tokens: List[str]) -> None:
    """Deactivate invalid device tokens after FCM reports them unusable."""
    if not tokens:
        return

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_devices
            SET
                is_active = FALSE,
                updated_at = NOW()
            WHERE fcm_token = ANY(%s)
            """,
            (tokens,),
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error("Deactivate invalid tokens error: %s", e)
    finally:
        cursor.close()
        return_connection(conn)


def _send_push_to_tokens(
    tokens: List[str],
    title: str,
    body: str,
    data: Dict[str, Any] | None = None,
    context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Send a push notification to a prepared list of tokens."""
    normalized_title = (title or "").strip()
    normalized_body = (body or "").strip()

    if not normalized_title or not normalized_body:
        return {
            "success": False,
            "message": "title and body are required",
            "sent_count": 0,
            "failure_count": 0,
        }

    if not tokens:
        return {
            "success": False,
            "message": "No active device tokens found",
            "sent_count": 0,
            "failure_count": 0,
        }

    payload_data = _normalize_data_payload(data)
    firebase_app = _get_firebase_app()

    if firebase_app is None or messaging is None:
        logger.info(
            "Push payload prepared but not sent because Firebase is not configured. token_count=%s context=%s",
            len(tokens),
            context or {},
        )
        return {
            "success": False,
            "message": "Firebase is not configured. Push payload prepared only.",
            "sent_count": 0,
            "failure_count": len(tokens),
            "data": {
                "token_count": len(tokens),
                "title": normalized_title,
                "body": normalized_body,
                "payload": payload_data or {},
                "context": context or {},
            },
        }

    sent_count = 0
    failure_count = 0
    invalid_tokens: List[str] = []
    errors = []

    try:
        for batch in _chunked(tokens, FCM_BATCH_SIZE):
            message = messaging.MulticastMessage(
                tokens=batch,
                data=payload_data,
                notification=messaging.Notification(
                    title=normalized_title,
                    body=normalized_body,
                ),
            )

            response = messaging.send_each_for_multicast(message, app=firebase_app)
            sent_count += response.success_count
            failure_count += response.failure_count

            for token, send_response in zip(batch, response.responses):
                if send_response.success:
                    continue

                exception = send_response.exception
                error_message = str(exception) if exception else "Unknown FCM error"
                error_name = exception.__class__.__name__ if exception else "UnknownError"
                errors.append(
                    {
                        "token_suffix": token[-12:] if len(token) > 12 else token,
                        "error": error_message,
                    }
                )

                if error_name in INVALID_TOKEN_ERROR_NAMES:
                    invalid_tokens.append(token)

        if invalid_tokens:
            _deactivate_tokens(invalid_tokens)

        message = "Push notification sent successfully"
        if sent_count and failure_count:
            message = "Push notification sent with partial failures"
        elif not sent_count:
            message = "Push notification failed for all devices"

        return {
            "success": sent_count > 0,
            "message": message,
            "sent_count": sent_count,
            "failure_count": failure_count,
            "deactivated_tokens": len(set(invalid_tokens)),
            "errors": errors,
        }
    except Exception as e:
        logger.error("Send push notification error: %s", e)
        return {
            "success": False,
            "message": str(e),
            "sent_count": sent_count,
            "failure_count": max(failure_count, len(tokens) - sent_count),
        }


def register_device(
    user_id: Any,
    fcm_token: Any,
    platform: Any = "android",
    device_name: Any = None,
    emp_code: Any = None,
):
    """Register or reactivate an FCM device token for a user."""
    token = (fcm_token or "").strip()
    if not token:
        return ({"success": False, "message": "fcm_token is required"}, 400)

    try:
        normalized_user_id = _normalize_user_id(user_id)
    except ValueError as e:
        return ({"success": False, "message": str(e)}, 400)

    normalized_platform = _normalize_platform(platform)
    normalized_device_name = _normalize_device_name(device_name)
    normalized_emp_code = (emp_code or "").strip() or None

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO user_devices (
                user_id, emp_code, fcm_token, platform, device_name, is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, TRUE, NOW(), NOW())
            ON CONFLICT (fcm_token)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                emp_code = EXCLUDED.emp_code,
                platform = EXCLUDED.platform,
                device_name = EXCLUDED.device_name,
                is_active = TRUE,
                updated_at = NOW()
            RETURNING id, user_id, emp_code, platform, device_name, is_active, created_at, updated_at
            """,
            (
                normalized_user_id,
                normalized_emp_code,
                token,
                normalized_platform,
                normalized_device_name,
            ),
        )

        device = cursor.fetchone()
        conn.commit()

        return (
            {
                "success": True,
                "message": "Device token registered successfully",
                "data": _sanitize_device_row(device),
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Register device error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def deactivate_device(fcm_token: Any):
    """Deactivate an FCM device token."""
    token = (fcm_token or "").strip()
    if not token:
        return ({"success": False, "message": "fcm_token is required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE user_devices
            SET
                is_active = FALSE,
                updated_at = NOW()
            WHERE fcm_token = %s
            RETURNING id, user_id, emp_code, platform, device_name, is_active, created_at, updated_at
            """,
            (token,),
        )

        device = cursor.fetchone()
        if not device:
            return ({"success": False, "message": "Device token not found"}, 404)

        conn.commit()

        return (
            {
                "success": True,
                "message": "Device token deactivated successfully",
                "data": _sanitize_device_row(device),
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Deactivate device error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def get_user_device_tokens(user_id: Any) -> List[str]:
    """Fetch all active FCM tokens for a user."""
    normalized_user_id = _normalize_user_id(user_id)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT fcm_token
            FROM user_devices
            WHERE user_id = %s AND is_active = TRUE
            ORDER BY updated_at DESC, id DESC
            """,
            (normalized_user_id,),
        )

        rows = cursor.fetchall()
        return [row["fcm_token"] for row in rows]
    finally:
        cursor.close()
        return_connection(conn)


def get_employee_device_tokens(emp_code: Any) -> List[str]:
    """Fetch all active FCM tokens for an employee code."""
    normalized_emp_code = _normalize_emp_code(emp_code)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT fcm_token
            FROM user_devices
            WHERE emp_code = %s AND is_active = TRUE
            ORDER BY updated_at DESC, id DESC
            """,
            (normalized_emp_code,),
        )

        rows = cursor.fetchall()
        return [row["fcm_token"] for row in rows]
    finally:
        cursor.close()
        return_connection(conn)


def get_department_device_tokens(
    emp_department: Any,
    exclude_emp_code: Any = None,
) -> List[str]:
    """Fetch active FCM tokens for employees in the same department."""
    normalized_department = (emp_department or "").strip()
    if not normalized_department:
        raise ValueError("emp_department is required")

    excluded_emp_code = (exclude_emp_code or "").strip() or None

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        sql = """
            SELECT DISTINCT ud.fcm_token
            FROM user_devices ud
            JOIN employees e ON e.emp_code = ud.emp_code
            LEFT JOIN users u ON u.emp_code = e.emp_code
            WHERE ud.is_active = TRUE
              AND TRIM(COALESCE(e.emp_department, '')) <> ''
              AND LOWER(TRIM(e.emp_department)) = LOWER(TRIM(%s))
              AND (%s IS NULL OR e.emp_code <> %s)
              AND COALESCE(u.is_active, TRUE) = TRUE
            ORDER BY ud.fcm_token
        """
        cursor.execute(sql, (normalized_department, excluded_emp_code, excluded_emp_code))
        rows = cursor.fetchall()
        return [row["fcm_token"] for row in rows]
    finally:
        cursor.close()
        return_connection(conn)


def send_push_notification(user_id: Any, title: str, body: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send a push notification to all active devices for the given user_id."""
    try:
        normalized_user_id = _normalize_user_id(user_id)
        tokens = get_user_device_tokens(normalized_user_id)
    except ValueError as e:
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }
    except Exception as e:
        logger.error("Fetch device tokens error: %s", e)
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }

    return _send_push_to_tokens(
        tokens,
        title,
        body,
        data=data,
        context={"user_id": normalized_user_id},
    )


def send_push_notification_to_employee(
    emp_code: Any,
    title: str,
    body: str,
    data: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Send a push notification using the employee-code identity already used by this repo."""
    try:
        normalized_emp_code = _normalize_emp_code(emp_code)
        tokens = get_employee_device_tokens(normalized_emp_code)
    except ValueError as e:
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }
    except Exception as e:
        logger.error("Fetch employee device tokens error: %s", e)
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }

    return _send_push_to_tokens(
        tokens,
        title,
        body,
        data=data,
        context={"emp_code": normalized_emp_code},
    )


def send_push_notification_to_department(
    emp_department: Any,
    title: str,
    body: str,
    data: Dict[str, Any] | None = None,
    exclude_emp_code: Any = None,
) -> Dict[str, Any]:
    """Send a push notification to active devices for a department team."""
    normalized_department = (emp_department or "").strip()
    normalized_exclude_emp_code = (exclude_emp_code or "").strip() or None

    if not normalized_department:
        return {
            "success": False,
            "message": "emp_department is required",
            "sent_count": 0,
            "failure_count": 0,
        }

    try:
        tokens = get_department_device_tokens(
            normalized_department,
            exclude_emp_code=normalized_exclude_emp_code,
        )
    except ValueError as e:
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }
    except Exception as e:
        logger.error("Fetch department device tokens error: %s", e)
        return {
            "success": False,
            "message": str(e),
            "sent_count": 0,
            "failure_count": 0,
        }

    return _send_push_to_tokens(
        tokens,
        title,
        body,
        data=data,
        context={
            "emp_department": normalized_department,
            "exclude_emp_code": normalized_exclude_emp_code,
        },
    )


def get_attendance_reminder_candidates(target_date: date | None = None) -> List[Dict[str, Any]]:
    """Fetch employees who should receive the daily attendance reminder."""
    reminder_date = target_date or date.today()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT DISTINCT
                e.emp_code,
                e.emp_full_name,
                e.emp_email
            FROM employees e
            LEFT JOIN users u ON u.emp_code = e.emp_code
            WHERE COALESCE(u.is_active, TRUE) = TRUE
              AND EXISTS (
                  SELECT 1
                  FROM user_devices ud
                  WHERE ud.emp_code = e.emp_code
                    AND ud.is_active = TRUE
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM attendance a
                  WHERE a.employee_email = e.emp_email
                    AND a.date = %s
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM leaves l
                  WHERE l.emp_code = e.emp_code
                    AND l.status IN ('pending', 'approved')
                    AND %s BETWEEN l.from_date AND l.to_date
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM attendance_exceptions ae
                  JOIN attendance a2 ON a2.id = ae.attendance_id
                  WHERE a2.employee_email = e.emp_email
                    AND a2.date = %s
                    AND ae.exception_type = 'late_arrival'
              )
            ORDER BY e.emp_full_name
            """,
            (reminder_date, reminder_date, reminder_date),
        )

        return [dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        return_connection(conn)


def get_lunch_reminder_candidates(target_date: date | None = None) -> List[Dict[str, Any]]:
    """Fetch active employees with devices who should receive the daily lunch reminder."""
    reminder_date = target_date or date.today()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT DISTINCT
                e.emp_code,
                e.emp_full_name,
                e.emp_email
            FROM employees e
            LEFT JOIN users u ON u.emp_code = e.emp_code
            WHERE COALESCE(u.is_active, TRUE) = TRUE
              AND EXISTS (
                  SELECT 1
                  FROM user_devices ud
                  WHERE ud.emp_code = e.emp_code
                    AND ud.is_active = TRUE
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM leaves l
                  WHERE l.emp_code = e.emp_code
                    AND l.status IN ('pending', 'approved')
                    AND %s BETWEEN l.from_date AND l.to_date
              )
            ORDER BY e.emp_full_name
            """,
            (reminder_date,),
        )

        return [dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        return_connection(conn)


def send_attendance_reminder_notifications(target_date: date | None = None) -> Dict[str, Any]:
    """Send attendance reminders to employees who have not updated attendance."""
    reminder_date = target_date or date.today()
    scheduled_for = _scheduled_datetime_for(reminder_date, Config.ATTENDANCE_REMINDER_TIME)

    try:
        candidates = get_attendance_reminder_candidates(reminder_date)
    except Exception as e:
        logger.error("Attendance reminder candidate lookup failed: %s", e)
        return {
            "success": False,
            "message": str(e),
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": 0,
            "sent_count": 0,
            "failed_count": 0,
        }

    if not candidates:
        return {
            "success": True,
            "message": "No attendance reminders required",
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": 0,
            "sent_count": 0,
            "failed_count": 0,
        }

    is_working, day_type = is_working_day(reminder_date, candidates[0]["emp_code"])
    if not is_working:
        return {
            "success": True,
            "message": f"Attendance reminders skipped on {day_type}",
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": len(candidates),
            "sent_count": 0,
            "failed_count": 0,
        }

    sent_count = 0
    failed_count = 0
    failures = []

    for candidate in candidates:
        try:
            result = send_push_notification_to_employee(
                candidate["emp_code"],
                "Attendance Reminder",
                "Clock in. If you already did, please ignore.",
                {"type": "attendance_reminder"},
            )
            _log_scheduled_notification_attempt(
                "attendance_reminder",
                candidate["emp_code"],
                "Attendance Reminder",
                "Clock in. If you already did, please ignore.",
                scheduled_for,
                result,
            )

            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
                failures.append(
                    {
                        "emp_code": candidate["emp_code"],
                        "message": result.get("message", "Push notification failed"),
                    }
                )
                logger.warning(
                    "Attendance reminder push failed for %s: %s",
                    candidate["emp_code"],
                    result.get("message"),
                )
        except Exception as e:
            failed_count += 1
            failures.append({"emp_code": candidate["emp_code"], "message": str(e)})
            logger.exception(
                "Attendance reminder push error for %s",
                candidate["emp_code"],
            )

    message = "Attendance reminders processed"
    if not sent_count and failed_count:
        message = "Attendance reminders failed for all candidates"
    elif sent_count and failed_count:
        message = "Attendance reminders sent with partial failures"

    return {
        "success": sent_count > 0 or not candidates,
        "message": message,
        "reminder_date": reminder_date.isoformat(),
        "total_candidates": len(candidates),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "failures": failures,
    }


def send_lunch_reminder_notifications(target_date: date | None = None) -> Dict[str, Any]:
    """Send lunch reminder notifications to active employees."""
    reminder_date = target_date or date.today()
    scheduled_for = _scheduled_datetime_for(reminder_date, Config.LUNCH_REMINDER_TIME)

    try:
        candidates = get_lunch_reminder_candidates(reminder_date)
    except Exception as e:
        logger.error("Lunch reminder candidate lookup failed: %s", e)
        return {
            "success": False,
            "message": str(e),
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": 0,
            "sent_count": 0,
            "failed_count": 0,
        }

    if not candidates:
        return {
            "success": True,
            "message": "No lunch reminders required",
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": 0,
            "sent_count": 0,
            "failed_count": 0,
        }

    is_working, day_type = is_working_day(reminder_date, candidates[0]["emp_code"])
    if not is_working:
        return {
            "success": True,
            "message": f"Lunch reminders skipped on {day_type}",
            "reminder_date": reminder_date.isoformat(),
            "total_candidates": len(candidates),
            "sent_count": 0,
            "failed_count": 0,
        }

    sent_count = 0
    failed_count = 0
    failures = []

    for candidate in candidates:
        try:
            result = send_push_notification_to_employee(
                candidate["emp_code"],
                "Lunch Time",
                "It's 1:25 PM. It's lunch time, Fawnix cares about your health.",
                {"type": "lunch_reminder"},
            )
            _log_scheduled_notification_attempt(
                "lunch_reminder",
                candidate["emp_code"],
                "Lunch Time",
                "It's 1:25 PM. It's lunch time, Fawnix cares about your health.",
                scheduled_for,
                result,
            )

            if result.get("success"):
                sent_count += 1
            else:
                failed_count += 1
                failures.append(
                    {
                        "emp_code": candidate["emp_code"],
                        "message": result.get("message", "Push notification failed"),
                    }
                )
                logger.warning(
                    "Lunch reminder push failed for %s: %s",
                    candidate["emp_code"],
                    result.get("message"),
                )
        except Exception as e:
            failed_count += 1
            failures.append({"emp_code": candidate["emp_code"], "message": str(e)})
            logger.exception(
                "Lunch reminder push error for %s",
                candidate["emp_code"],
            )

    message = "Lunch reminders processed"
    if not sent_count and failed_count:
        message = "Lunch reminders failed for all candidates"
    elif sent_count and failed_count:
        message = "Lunch reminders sent with partial failures"

    return {
        "success": sent_count > 0 or not candidates,
        "message": message,
        "reminder_date": reminder_date.isoformat(),
        "total_candidates": len(candidates),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "failures": failures,
    }
