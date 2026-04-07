"""
Users Routes
User management endpoints
"""

from flask import Blueprint, jsonify, request

from middleware.auth_middleware import token_required
from services.user_management_service import (
    can_manage_users,
    create_employee,
    delete_employee,
    get_employee,
    update_employee,
)

users_bp = Blueprint('users', __name__)


@users_bp.route('/', methods=['GET'])
def list_users():
    """List users - placeholder"""
    return jsonify({"message": "User management endpoints"}), 200


@users_bp.route('', methods=['POST'], strict_slashes=False)
@token_required
def create_employee_route(current_user):
    """
    Create employee API
    POST /api/users
    """
    if not can_manage_users(current_user):
        return jsonify({
            "success": False,
            "message": "Access denied"
        }), 403

    payload = request.get_json() or {}
    result, status_code = create_employee(payload)
    return jsonify(result), status_code


@users_bp.route('/<string:emp_code>', methods=['DELETE'])
@token_required
def delete_employee_route(current_user, emp_code):
    """
    Delete employee API
    DELETE /api/users/{emp_code}
    """
    if not can_manage_users(current_user):
        return jsonify({
            "success": False,
            "message": "Access denied"
        }), 403

    result, status_code = delete_employee(emp_code, requested_by_emp_code=current_user.get('emp_code'))
    return jsonify(result), status_code


@users_bp.route('/<string:emp_code>', methods=['GET'])
@token_required
def get_employee_route(current_user, emp_code):
    """
    Get employee details API
    GET /api/users/{emp_code}
    """
    result, status_code = get_employee(emp_code)
    return jsonify(result), status_code


@users_bp.route('/<string:emp_code>', methods=['PUT'])
@token_required
def update_employee_route(current_user, emp_code):
    """
    Update employee details API
    PUT /api/users/{emp_code}
    
    Request Body (all fields optional):
        {
            "emp_full_name": "John Doe",
            "emp_contact": "9876543210",
            "emp_email": "john@company.com",
            "emp_designation": "Senior Engineer",
            "emp_department": "Engineering",
            "emp_manager": "EMP001",
            "emp_grade": "A",
            "emp_shift_id": 1,
            ...
        }
    """
    if not can_manage_users(current_user):
        return jsonify({
            "success": False,
            "message": "Access denied"
        }), 403

    payload = request.get_json() or {}
    result, status_code = update_employee(
        emp_code, 
        payload, 
        updated_by_emp_code=current_user.get('emp_code')
    )
    return jsonify(result), status_code
