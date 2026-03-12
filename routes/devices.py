"""
Device Routes
FCM device registration and deactivation endpoints.
"""

from flask import Blueprint, jsonify, request

from middleware.auth_middleware import token_required
from services.notification_service import deactivate_device, register_device

devices_bp = Blueprint('devices', __name__)


@devices_bp.route('/register', methods=['POST'])
@token_required
def register(_current_user):
    """Register or update an FCM device token."""
    data = request.get_json() or {}

    result, status_code = register_device(
        user_id=data.get('user_id'),
        fcm_token=data.get('fcm_token'),
        platform=data.get('platform'),
        device_name=data.get('device_name'),
        emp_code=_current_user.get('emp_code'),
    )
    return jsonify(result), status_code


@devices_bp.route('/deactivate', methods=['POST'])
@token_required
def deactivate(_current_user):
    """Deactivate an FCM device token."""
    data = request.get_json() or {}

    result, status_code = deactivate_device(data.get('fcm_token'))
    return jsonify(result), status_code
