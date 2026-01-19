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
