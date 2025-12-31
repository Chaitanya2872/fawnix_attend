"""
Leave Routes
Leave management endpoints
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.leaves_service import (
    apply_leave, approve_leave, get_my_leaves,
    get_team_leaves, cancel_leave, get_leave_summary
)

leaves_bp = Blueprint('leaves', __name__)


@leaves_bp.route('/apply', methods=['POST'])
@token_required
def apply(current_user):
    """
    Apply for leave
    
    Request Body:
    {
        "from_date": "25-12-2025",
        "to_date": "27-12-2025",
        "leave_type": "casual",
        "duration": "full_day",
        "notes": "Family function"
    }
    """
    data = request.get_json()
    
    from_date = data.get('from_date')
    to_date = data.get('to_date')
    leave_type = data.get('leave_type')
    duration = data.get('duration')
    notes = data.get('notes', '')
    
    if not all([from_date, to_date, leave_type, duration]):
        return jsonify({
            "success": False,
            "message": "from_date, to_date, leave_type, and duration are required"
        }), 400
    
    result = apply_leave(
        current_user['emp_code'],
        from_date,
        to_date,
        leave_type,
        duration,
        notes
    )
    
    return jsonify(result[0]), result[1]


@leaves_bp.route('/my-leaves', methods=['GET'])
@token_required
def my_leaves(current_user):
    """
    Get my leave requests
    
    Query Params:
    - status: pending, approved, rejected, cancelled (optional)
    - limit: number of records (default: 50)
    """
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    result = get_my_leaves(current_user['emp_code'], status, limit)
    return jsonify(result[0]), result[1]


@leaves_bp.route('/team-leaves', methods=['GET'])
@token_required
def team_leaves(current_user):
    """
    Get team leave requests (for managers)
    
    Query Params:
    - status: pending, approved, rejected (optional)
    - limit: number of records (default: 50)
    """
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    result = get_team_leaves(current_user['emp_code'], status, limit)
    return jsonify(result[0]), result[1]


@leaves_bp.route('/approve', methods=['POST'])
@token_required
def approve(current_user):
    """
    Approve or reject leave request (manager only)
    
    Request Body:
    {
        "leave_id": 123,
        "action": "approved",  // or "rejected"
        "remarks": "Approved for urgent work"
    }
    """
    data = request.get_json()
    
    leave_id = data.get('leave_id')
    action = data.get('action')
    remarks = data.get('remarks', '')
    
    if not leave_id or not action:
        return jsonify({
            "success": False,
            "message": "leave_id and action are required"
        }), 400
    
    result = approve_leave(leave_id, current_user['emp_code'], action, remarks)
    return jsonify(result[0]), result[1]


@leaves_bp.route('/cancel', methods=['POST'])
@token_required
def cancel(current_user):
    """
    Cancel pending leave request
    
    Request Body:
    {
        "leave_id": 123
    }
    """
    data = request.get_json()
    leave_id = data.get('leave_id')
    
    if not leave_id:
        return jsonify({"success": False, "message": "leave_id required"}), 400
    
    result = cancel_leave(leave_id, current_user['emp_code'])
    return jsonify(result[0]), result[1]


@leaves_bp.route('/summary', methods=['GET'])
@token_required
def summary(current_user):
    """
    Get leave summary with balance and auto-deductions
    
    Query Params:
    - year: year (default: current year)
    """
    year = request.args.get('year', type=int)
    
    result = get_leave_summary(current_user['emp_code'], year)
    return jsonify(result[0]), result[1]


@leaves_bp.route('/balance', methods=['GET'])
@token_required
def balance(current_user):
    """Get leave balance"""
    from services.leaves_service import get_employee_leave_balance
    
    balance = get_employee_leave_balance(current_user['emp_code'])
    return jsonify({
        "success": True,
        "data": balance
    }), 200


@leaves_bp.route('/holidays', methods=['GET'])
@token_required
def get_holidays(current_user):
    """
    Get organization holidays for a given year
    
    Query Params:
    - year: year (required)
    
    Example: /api/leaves/holidays?year=2026
    """
    from services.leaves_service import get_organization_holidays
    
    try:
        year = request.args.get('year', type=int)
        
        if not year:
            return jsonify({
                "success": False,
                "message": "year query parameter is required"
            }), 400
        
        holidays = get_organization_holidays(year)
        
        return jsonify({
            "success": True,
            "year": year,
            "holidays": holidays,
            "count": len(holidays)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_holidays: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500