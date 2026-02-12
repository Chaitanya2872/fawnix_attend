"""
Admin Routes
Administrative endpoints
"""

from flask import Blueprint, jsonify
from middleware.auth_middleware import token_required
from middleware.admin_middleware import hr_or_devtester_required
from services import admin_service
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
    Optional query param: ?limit=100
    """
    limit = request.args.get('limit', default=100, type=int)

    response, status_code = admin_service.get_all_attendance_history(limit)

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

