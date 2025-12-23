"""
Attendance Routes
Clock in/out and attendance management endpoints
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.geocoding_service import get_address_from_coordinates
from services.attendance_service import (
    clock_in, clock_out, get_attendance_status, get_attendance_history
)

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('/login', methods=['POST'])
@token_required
def login(current_user):
    """Clock in"""
    data = request.get_json()
    
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    
    result = clock_in(
        current_user['emp_email'],
        current_user['emp_full_name'],
        current_user.get('emp_contact', ''),
        latitude,
        longitude
    )
    
    return jsonify(result[0]), result[1]


@attendance_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Clock out"""
    data = request.get_json()
    
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    
    result = clock_out(
        current_user['emp_email'],
        latitude,
        longitude
    )
    
    return jsonify(result[0]), result[1]


@attendance_bp.route('/status', methods=['GET'])
@token_required
def status(current_user):
    """Get attendance status"""
    result = get_attendance_status(current_user['emp_email'])
    return jsonify(result[0]), result[1]


@attendance_bp.route('/history', methods=['GET'])
@token_required
def history(current_user):
    """Get attendance history"""
    limit = request.args.get('limit', 30, type=int)
    result = get_attendance_history(current_user['emp_email'], limit)
    return jsonify(result[0]), result[1]
