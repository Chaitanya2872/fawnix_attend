"""
Admin Routes
Administrative endpoints
"""

from flask import Blueprint, jsonify
from middleware.auth_middleware import token_required
from middleware.admin_middleware import hr_or_devtester_required
from services import admin_service
from services.notification_service import send_push_notification_to_employee
from database.connection import get_db_connection, return_connection
from datetime import datetime, date, time
from flask import request

admin_bp = Blueprint('admin', __name__)


def serialize_row(row):
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date, time)):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _resolve_emp_code_from_user_id(user_id):
    try:
        normalized_user_id = int(user_id)
    except (TypeError, ValueError):
        return None, "user_id must be a valid integer"

    if normalized_user_id <= 0:
        return None, "user_id must be greater than 0"

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT emp_code
            FROM users
            WHERE id = %s
            """,
            (normalized_user_id,),
        )
        row = cursor.fetchone()
        if not row or not row.get("emp_code"):
            return None, "No employee code found for the provided user_id"

        return row["emp_code"], None
    finally:
        cursor.close()
        return_connection(conn)


@admin_bp.route('/employees', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_employees(current_user):
    """
    Get all employees
    Accessible only by HR and DevTester
    """
    employees = admin_service.get_all_employees()

    return jsonify({
        "success": True,
        "count": len(employees),
        "data": [serialize_row(emp) for emp in employees]
    }), 200
    

@admin_bp.route('/attendance/status', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_attendance_status(current_user):
    """
    Get current attendance status for all employees
    Admin only
    """
    response, status_code = admin_service.get_all_attendance_status()

    return jsonify(response), status_code

@admin_bp.route('/attendance/history', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_attendance_history(current_user):
    """
    Get attendance history for all employees
    Optional query params:
    - limit: number of records (optional, legacy)
    - page: page number (optional)
    - page_size: page size (optional)
    - date: YYYY-MM-DD (optional)
    """
    limit = request.args.get('limit', type=int)
    page = request.args.get('page', type=int)
    page_size = request.args.get('page_size', type=int)
    date_str = request.args.get('date')
    target_date = None

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400

    response, status_code = admin_service.get_all_attendance_history(
        limit=limit,
        target_date=target_date,
        page=page,
        page_size=page_size
    )

    return jsonify(response), status_code

@admin_bp.route('/attendance/summary', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_day_summary(current_user):
    """
    Get day summary for all employees
    Optional query param: ?date=YYYY-MM-DD
    """
    date_str = request.args.get('date')
    target_date = None

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400

    response, status_code = admin_service.get_all_day_summary(target_date)

    return jsonify(response), status_code


@admin_bp.route('/activities', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_activities(current_user):
    """
    Get activities for all employees
    Optional query params:
    - limit: number of records (default: 100)
    - type: activity_type filter (optional)
    - include_tracking: true/false (default: true) for field visit tracking points
    - include_activity_tracking: true/false (default: true) for activity GPS points
    """
    limit = request.args.get('limit', default=100, type=int)
    activity_type = request.args.get('type')
    include_tracking = request.args.get('include_tracking', default='true')
    include_tracking = str(include_tracking).lower() in ['1', 'true', 'yes']
    include_activity_tracking = request.args.get('include_activity_tracking', default='true')
    include_activity_tracking = str(include_activity_tracking).lower() in ['1', 'true', 'yes']

    response, status_code = admin_service.get_all_activities(
        limit=limit,
        activity_type=activity_type,
        include_tracking=include_tracking,
        include_activity_tracking=include_activity_tracking
    )

    return jsonify(response), status_code


@admin_bp.route('/leaves', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_leaves(current_user):
    """
    Get leave requests for all employees
    Optional query params:
    - limit: number of records (default: 100)
    - status: pending/approved/rejected/cancelled (optional)
    - emp_code: filter by employee code (optional)
    - from_date: YYYY-MM-DD (optional)
    - to_date: YYYY-MM-DD (optional)
    """
    limit = request.args.get('limit', default=100, type=int)
    status = request.args.get('status')
    emp_code = request.args.get('emp_code')
    from_date_str = request.args.get('from_date')
    to_date_str = request.args.get('to_date')

    from_date = None
    to_date = None

    if from_date_str:
        try:
            from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid from_date format. Use YYYY-MM-DD"
            }), 400

    if to_date_str:
        try:
            to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid to_date format. Use YYYY-MM-DD"
            }), 400

    response, status_code = admin_service.get_all_leaves(
        limit=limit,
        status=status,
        emp_code=emp_code,
        from_date=from_date,
        to_date=to_date
    )

    return jsonify(response), status_code

@admin_bp.route('/overtime-records', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_all_overtime_records(current_user):
    """
    Get overtime records for all employees

    Optional query params:
    - limit: number of records (default: 100)
    - status: eligible/requested/approved/rejected/expired/utilized (optional)
    - emp_code: filter by employee code (optional)
    - from_date: YYYY-MM-DD (optional)
    - to_date: YYYY-MM-DD (optional)
    """

    limit = request.args.get('limit', default=100, type=int)
    status = request.args.get('status')
    emp_code = request.args.get('emp_code')
    from_date_str = request.args.get('from_date')
    to_date_str = request.args.get('to_date')

    from_date = None
    to_date = None

    if from_date_str:
        try:
            from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid from_date format. Use YYYY-MM-DD"
            }), 400

    if to_date_str:
        try:
            to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid to_date format. Use YYYY-MM-DD"
            }), 400

    response, status_code = admin_service.get_all_overtime_records(
        limit=limit,
        status=status,
        emp_code=emp_code,
        from_date=from_date,
        to_date=to_date
    )

    return jsonify(response), status_code


@admin_bp.route('/test-push', methods=['POST'])
@token_required
@hr_or_devtester_required
def send_test_push(current_user):
    """
    Send a manual test push notification to an employee device.

    Request body:
        {
            "emp_code": "2872"
        }
    or
        {
            "user_id": 4
        }
    Optional fields:
        - title
        - body
        - data
    """
    data = request.get_json() or {}

    emp_code = (data.get('emp_code') or '').strip()
    if not emp_code and data.get('user_id') is not None:
        emp_code, error_message = _resolve_emp_code_from_user_id(data.get('user_id'))
        if error_message:
            return jsonify({
                "success": False,
                "message": error_message
            }), 400

    if not emp_code:
        return jsonify({
            "success": False,
            "message": "emp_code or user_id is required"
        }), 400

    title = (data.get('title') or 'Test Notification').strip()
    body = (data.get('body') or 'This is a test push notification from the backend.').strip()
    payload = data.get('data') if isinstance(data.get('data'), dict) else {}
    payload.setdefault('type', 'test_notification')
    payload.setdefault('employee_id', emp_code)
    payload.setdefault('attendance_id', '0')
    payload.setdefault('status', 'test')
    payload.setdefault('timestamp', datetime.utcnow().isoformat())

    result = send_push_notification_to_employee(
        emp_code,
        title,
        body,
        payload
    )

    result.update({
        "target_emp_code": emp_code,
        "requested_by": current_user.get('emp_code')
    })
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code
