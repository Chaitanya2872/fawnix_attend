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
from services.attendance_away_service import process_attendance_away_alert
from datetime import datetime

attendance_bp = Blueprint('attendance', __name__)

def _is_privileged(current_user) -> bool:
    designation = (current_user.get('emp_designation') or '').strip().lower()
    department = (current_user.get('emp_department') or '').strip().lower()
    return designation in ['hr', 'cmd', 'admin'] or department == 'hr'


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


def _resolve_authenticated_user_id(current_user):
    raw_user_id = current_user.get('id') or current_user.get('user_id')
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None, ({"sent": 0, "failed": 0, "message": "Authenticated user id is invalid"}, 400)

    if user_id <= 0:
        return None, ({"sent": 0, "failed": 0, "message": "Authenticated user id is invalid"}, 400)

    return user_id, None

@attendance_bp.route('/login', methods=['POST'])
@token_required
def login(current_user):
    """
    Clock in - Start attendance session
    
    Request Body:
        {
            "latitude": "17.385044",       // optional
            "longitude": "78.486671",      // optional
            "attendance_type": "office"    // optional: office | site
        }
    
    Guards:
        - Only one active session allowed
        - Must clock out before new clock in
    """
    data = request.get_json()
    
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    attendance_type = data.get('attendance_type')
    
    result = clock_in(
        current_user['emp_email'],
        current_user['emp_full_name'],
        current_user.get('emp_contact', ''),
        latitude,
        longitude,
        attendance_type
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

    if emp_code and emp_code != current_user.get('emp_code'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403
    if emp_email and emp_email != current_user.get('emp_email'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403

    target_email = current_user['emp_email']
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

    if emp_code and emp_code != current_user.get('emp_code'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403
    if emp_email and emp_email != current_user.get('emp_email'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403

    target_email = current_user['emp_email']
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
    
    if emp_code and emp_code != current_user.get('emp_code'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403
    if emp_email and emp_email != current_user.get('emp_email'):
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own attendance in this endpoint."
        }), 403

    target_email = current_user['emp_email']
    result = get_day_summary(target_email, target_date)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/team-status', methods=['GET'])
@token_required
def team_status(current_user):
    """
    Get attendance status for all employees (HR/CMD/Admin) or a specific employee.
    """
    if not _is_privileged(current_user):
        return jsonify({
            "success": False,
            "message": "Unauthorized. Team attendance is restricted."
        }), 403

    emp_code = request.args.get('emp_code')
    emp_email = request.args.get('emp_email')

    if not emp_code and not emp_email:
        response, status_code = admin_service.get_all_attendance_status()
        return jsonify(response), status_code

    if emp_code:
        emp_email = _resolve_emp_email(emp_code)
        if not emp_email:
            return jsonify({"success": False, "message": "Employee not found"}), 404

    result = get_attendance_status(emp_email)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/team-history', methods=['GET'])
@token_required
def team_history(current_user):
    """
    Get attendance history for all employees (HR/CMD/Admin) or a specific employee.
    """
    if not _is_privileged(current_user):
        return jsonify({
            "success": False,
            "message": "Unauthorized. Team attendance history is restricted."
        }), 403

    limit = request.args.get('limit', 30, type=int)
    emp_code = request.args.get('emp_code')
    emp_email = request.args.get('emp_email')

    if not emp_code and not emp_email:
        response, status_code = admin_service.get_all_attendance_history(limit)
        return jsonify(response), status_code

    if emp_code:
        emp_email = _resolve_emp_email(emp_code)
        if not emp_email:
            return jsonify({"success": False, "message": "Employee not found"}), 404

    result = get_attendance_history(emp_email, limit)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/team-day-summary', methods=['GET'])
@token_required
def team_day_summary(current_user):
    """
    Get day summary for all employees (HR/CMD/Admin) or a specific employee.
    """
    if not _is_privileged(current_user):
        return jsonify({
            "success": False,
            "message": "Unauthorized. Team day summary is restricted."
        }), 403

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

    if not emp_code and not emp_email:
        response, status_code = admin_service.get_all_day_summary(target_date)
        return jsonify(response), status_code

    if emp_code:
        emp_email = _resolve_emp_email(emp_code)
        if not emp_email:
            return jsonify({"success": False, "message": "Employee not found"}), 404

    result = get_day_summary(emp_email, target_date)
    return jsonify(result[0]), result[1]


@attendance_bp.route('/away', methods=['POST'])
@token_required
def attendance_away(current_user):
    """
    Send away alert notification when user is >=100m from expected location.

    Request Body:
        {
            "user_id": 123,
            "distance_m": 150.5,
            "timestamp": "2026-03-29T10:15:00Z",
            "lat": 17.385044,
            "lon": 78.486671
        }

    Response:
        { "sent": 1, "failed": 0, "message": "..." }
    """
    data = request.get_json() or {}

    auth_user_id, error_response = _resolve_authenticated_user_id(current_user)
    if error_response:
        return jsonify(error_response[0]), error_response[1]

    try:
        target_user_id = int(data.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"sent": 0, "failed": 0, "message": "user_id must be a valid integer"}), 400

    if target_user_id <= 0:
        return jsonify({"sent": 0, "failed": 0, "message": "user_id must be greater than 0"}), 400

    if not _is_privileged(current_user) and target_user_id != auth_user_id:
        return jsonify({"sent": 0, "failed": 0, "message": "Unauthorized for this user_id"}), 403

    result, status_code = process_attendance_away_alert(data)
    return jsonify(result), status_code
