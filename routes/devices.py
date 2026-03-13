"""
Device Routes
FCM device registration and deactivation endpoints.
"""

from flask import Blueprint, jsonify, request

from middleware.auth_middleware import token_required
from services.notification_service import deactivate_device, register_device

devices_bp = Blueprint('devices', __name__)


def _resolve_authenticated_identity(current_user):
    """Resolve numeric user id and emp_code from the authenticated user context."""
    if not current_user:
        return None, None, ({"success": False, "message": "Authenticated user not found"}, 401)

    emp_code = (current_user.get('emp_code') or '').strip()
    if not emp_code:
        return None, None, ({"success": False, "message": "Authenticated user emp_code missing"}, 400)

    raw_user_id = current_user.get('id') or current_user.get('user_id')
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None, None, (
            {"success": False, "message": "Authenticated user does not contain a valid numeric user id"},
            400,
        )

    if user_id <= 0:
        return None, None, (
            {"success": False, "message": "Authenticated user does not contain a valid numeric user id"},
            400,
        )

    return user_id, emp_code, None


@devices_bp.route('/register', methods=['POST'])
@token_required
def register(_current_user):
    """Register or update an FCM device token."""
    data = request.get_json() or {}
    user_id, emp_code, error_response = _resolve_authenticated_identity(_current_user)
    if error_response:
        return jsonify(error_response[0]), error_response[1]

    result, status_code = register_device(
        user_id=user_id,
        fcm_token=data.get('fcm_token'),
        platform=data.get('platform'),
        device_name=data.get('device_name'),
        emp_code=emp_code,
    )
    return jsonify(result), status_code


@devices_bp.route('/deactivate', methods=['POST'])
@token_required
def deactivate(_current_user):
    """Deactivate an FCM device token."""
    data = request.get_json() or {}

    result, status_code = deactivate_device(data.get('fcm_token'))
    return jsonify(result), status_code
