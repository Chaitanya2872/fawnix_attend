"""
Attendance Routes
Clock in/out and attendance management endpoints
"""

from flask import Blueprint, request, jsonify
from database.connection import get_db_connection, return_connection
from services import admin_service
from middleware.auth_middleware import token_required
from services.attendance_service import (
    clock_in, clock_out, get_attendance_status, 
    get_attendance_history, get_day_summary
)
from datetime import datetime

attendance_bp = Blueprint('attendance', __name__)

def _is_privileged(current_user) -> bool:
    designation = (current_user.get('emp_designation') or '').strip().lower()
    return designation in ['hr', 'cmd', 'admin']


def _resolve_emp_email(emp_code: str):
    if not emp_code:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT emp_email FROM employees WHERE emp_code = %s",
            (emp_code,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return row.get('emp_email') if hasattr(row, 'keys') else row[0]
    finally:
        cursor.close()
        return_connection(conn)

@attendance_bp.route('/login', methods=['POST'])
@token_required
def login(current_user):
    """
    Clock in - Start attendance session
    
    Request Body:
        {
            "latitude": "17.385044",  // optional
            "longitude": "78.486671"  // optional
        }
    
    Guards:
        - Only one active session allowed
        - Must clock out before new clock in
    """
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
    """
    Clock out - End attendance session
    
    Request Body:
        {
            "latitude": "17.385044",  // optional
            "longitude": "78.486671"  // optional
        }
    
    Actions:
        - Ends all active activities
        - Ends all active field visits
        - Calculates comp-off if applicable
    """
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
    """
    Get current attendance status
    
    Returns:
        - Current session info
        - Active activities
        - Active field visits
    """
    emp_code = request.args.get('emp_code')
    emp_email = request.args.get('emp_email')

    if _is_privileged(current_user):
        if not emp_code and not emp_email:
            response, status_code = admin_service.get_all_attendance_status()
            return jsonify(response), status_code

        if emp_code:
            emp_email = _resolve_emp_email(emp_code)
            if not emp_email:
                return jsonify({"success": False, "message": "Employee not found"}), 404
    elif emp_code or emp_email:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance."
        }), 403

    target_email = current_user['emp_email']
    if _is_privileged(current_user) and emp_email:
        target_email = emp_email
    result = get_attendance_status(target_email)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/history', methods=['GET'])
@token_required
def history(current_user):
    """
    Get attendance history
    
    Query Params:
        limit: Number of records (default: 30)
    """
    limit = request.args.get('limit', 30, type=int)
    emp_code = request.args.get('emp_code')
    emp_email = request.args.get('emp_email')

    if _is_privileged(current_user):
        if not emp_code and not emp_email:
            response, status_code = admin_service.get_all_attendance_history(limit)
            return jsonify(response), status_code

        if emp_code:
            emp_email = _resolve_emp_email(emp_code)
            if not emp_email:
                return jsonify({"success": False, "message": "Employee not found"}), 404
    elif emp_code or emp_email:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance."
        }), 403

    target_email = current_user['emp_email']
    if _is_privileged(current_user) and emp_email:
        target_email = emp_email
    result = get_attendance_history(target_email, limit)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/day-summary', methods=['GET'])
@token_required
def day_summary(current_user):
    """
    Get complete day summary
    
    Query Params:
        date: Date in YYYY-MM-DD format (default: today)
    
    Returns:
        - Attendance record
        - All activities
        - All field visits
        - Summary statistics
    """
    date_str = request.args.get('date')
    emp_code = request.args.get('emp_code')
    emp_email = request.args.get('emp_email')
    target_date = None
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400
    
    if _is_privileged(current_user):
        if not emp_code and not emp_email:
            response, status_code = admin_service.get_all_day_summary(target_date)
            return jsonify(response), status_code

        if emp_code:
            emp_email = _resolve_emp_email(emp_code)
            if not emp_email:
                return jsonify({"success": False, "message": "Employee not found"}), 404
    elif emp_code or emp_email:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance."
        }), 403

    target_email = current_user['emp_email']
    if _is_privileged(current_user) and emp_email:
        target_email = emp_email
    result = get_day_summary(target_email, target_date)
    return jsonify(result[0]), result[1]
