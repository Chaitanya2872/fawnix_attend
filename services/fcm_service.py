"""
FCM Service
Thin wrapper around the existing notification service for backend-only FCM delivery.
"""

from typing import Any, Dict

from services.notification_service import (
    _get_firebase_app,
    _send_push_to_tokens,
    get_employee_device_tokens,
)


def initialize_firebase():
    """Initialize Firebase Admin once and return the app instance when configured."""
    return _get_firebase_app()


def send_to_token(token: str, title: str, body: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send a notification to a single FCM token."""
    normalized_token = (token or "").strip()
    if not normalized_token:
        return {
            "success": False,
            "message": "token is required",
            "token_count": 0,
            "sent_count": 0,
            "failure_count": 0,
        }

    result = _send_push_to_tokens(
        [normalized_token],
        title,
        body,
        data=data,
        context={"delivery_scope": "single_token"},
    )
    result["token_count"] = 1
    return result


def send_to_user_tokens(emp_code: str, title: str, body: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send a notification to all active device tokens for an employee."""
    tokens = get_employee_device_tokens(emp_code)
    result = _send_push_to_tokens(
        tokens,
        title,
        body,
        data=data,
        context={"delivery_scope": "employee", "emp_code": emp_code},
    )
    result["token_count"] = len(tokens)
    return result
