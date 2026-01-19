"""
Admin Routes
Administrative endpoints
"""

from flask import Blueprint, jsonify
from middleware.auth_middleware import token_required
from middleware.admin_middleware import hr_or_devtester_required
from services import admin_service
from datetime import datetime, date, time

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
    

@admin_bp.route('/attendance', methods=['GET'])
@token_required
@hr_or_devtester_required
def get_attendance(current_user):
    """
    Get attendance records
    Accessible only by HR and DevTester
    """
    attendance_records = admin_service.get_all_attendance_records()

    return jsonify({
        "success": True,
        "count": len(attendance_records),
        "data": [serialize_row(record) for record in attendance_records]
    }), 200