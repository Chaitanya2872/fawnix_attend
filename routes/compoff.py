"""
Comp-off Routes
API endpoints for overtime tracking and comp-off management
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.compoff_service import (
    get_employee_overtime_records,
    request_compoff,
    get_my_compoff_requests,
    approve_compoff_request,
    cancel_compoff_request,
    get_compoff_balance
)

compoff_bp = Blueprint('compoff', __name__)


@compoff_bp.route('/overtime-records', methods=['GET'])
@token_required
def overtime_records(current_user):
    """
    Get employee's overtime records
    
    Query Params:
    - status: eligible, requested, approved, rejected, expired, utilized (optional)
    - limit: number of records (default: 50)
    
    Returns:
    - List of overtime records with comp-off days
    - Summary of eligible, pending, and approved comp-offs
    
    Example: /api/compoff/overtime-records?status=eligible&limit=20
    """
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    result = get_employee_overtime_records(
        current_user['emp_code'],
        status,
        limit
    )
    
    return jsonify(result[0]), result[1]


@compoff_bp.route('/request', methods=['POST'])
@token_required
def request_comp_off(current_user):
    """
    Request comp-off based on selected overtime records
    
    Request Body:
    {
        "overtime_record_ids": [1, 2, 3],  // required
        "reason": "Extra hours worked",    // optional
        "notes": "Additional notes"        // optional
    }
    
    Business Rules:
    1. All records must be 'eligible' status
    2. Records must not be expired
    3. Must be within 30-day recording window
    4. If > 3 comp-offs in current month, requires CMD approval
    
    Returns:
    - Request ID
    - Total comp-off days
    - Approval level (manager/cmd)
    - Status
    """
    data = request.get_json()
    
    overtime_record_ids = data.get('overtime_record_ids', [])
    reason = data.get('reason', '')
    notes = data.get('notes', '')
    
    if not overtime_record_ids:
        return jsonify({
            "success": False,
            "message": "overtime_record_ids array is required"
        }), 400
    
    result = request_compoff(
        current_user['emp_code'],
        overtime_record_ids,
        reason,
        notes
    )
    
    return jsonify(result[0]), result[1]


@compoff_bp.route('/my-requests', methods=['GET'])
@token_required
def my_requests(current_user):
    """
    Get employee's comp-off requests
    
    Query Params:
    - status: pending, approved, rejected, cancelled, utilized (optional)
    - limit: number of records (default: 50)
    
    Returns:
    - List of comp-off requests with details
    - Approval status and reviewer information
    
    Example: /api/compoff/my-requests?status=pending
    """
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    result = get_my_compoff_requests(
        current_user['emp_code'],
        status,
        limit
    )
    
    return jsonify(result[0]), result[1]


@compoff_bp.route('/approve', methods=['POST'])
@token_required
def approve(current_user):
    """
    Approve or reject comp-off request
    
    Authorization:
    - Manager: Can approve 'manager' level requests for their team
    - CMD/HR/Admin: Can approve both 'manager' and 'cmd' level requests
    
    Request Body:
    {
        "request_id": 123,                    // required
        "action": "approved",                 // required: "approved" or "rejected"
        "remarks": "Approved for good work"   // optional
    }
    
    Business Rule:
    - If employee has > 3 comp-off requests in current month,
      approval_level will be 'cmd' and requires CMD/HR/Admin approval
    
    Returns:
    - Updated request status
    - Comp-off days approved/rejected
    """
    data = request.get_json()
    
    request_id = data.get('request_id')
    action = data.get('action')
    remarks = data.get('remarks', '')
    
    if not request_id or not action:
        return jsonify({
            "success": False,
            "message": "request_id and action are required"
        }), 400
    
    if action not in ['approved', 'rejected']:
        return jsonify({
            "success": False,
            "message": "action must be 'approved' or 'rejected'"
        }), 400
    
    result = approve_compoff_request(
        request_id,
        current_user['emp_code'],
        action,
        remarks
    )
    
    return jsonify(result[0]), result[1]


@compoff_bp.route('/cancel', methods=['POST'])
@token_required
def cancel(current_user):
    """
    Cancel pending comp-off request
    
    Only pending requests can be cancelled.
    Overtime records will be reset to 'eligible' status.
    
    Request Body:
    {
        "request_id": 123  // required
    }
    
    Returns:
    - Confirmation of cancellation
    """
    data = request.get_json()
    request_id = data.get('request_id')
    
    if not request_id:
        return jsonify({
            "success": False,
            "message": "request_id is required"
        }), 400
    
    result = cancel_compoff_request(
        request_id,
        current_user['emp_code']
    )
    
    return jsonify(result[0]), result[1]


@compoff_bp.route('/balance', methods=['GET'])
@token_required
def balance(current_user):
    """
    Get comp-off balance summary
    
    Returns:
    - Approved balance (available to use as leave)
    - Eligible not yet requested
    - Pending approval
    - Total potential comp-off days
    
    Example Response:
    {
        "success": true,
        "data": {
            "approved_balance": 2.0,
            "eligible_not_requested": 1.5,
            "eligible_records_count": 3,
            "pending_approval": 0.5,
            "total_potential": 3.5
        }
    }
    """
    result = get_compoff_balance(current_user['emp_code'])
    return jsonify(result[0]), result[1]


@compoff_bp.route('/team-requests', methods=['GET'])
@token_required
def team_requests(current_user):
    """
    Get comp-off requests for manager's team (for approval)
    
    Authorization: Manager, HR, CMD, Admin
    
    Query Params:
    - status: pending, approved, rejected (optional)
    - limit: number of records (default: 50)
    
    Returns:
    - List of team members' comp-off requests
    - Approval level and priority indicators
    """
    from services.compoff_service import get_team_compoff_requests
    
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    # Check if user is a manager or admin
    user_role = current_user.get('role', '').lower()
    if user_role not in ['manager', 'hr', 'cmd', 'admin']:
        return jsonify({
            "success": False,
            "message": "Unauthorized. Manager access required."
        }), 403
    
    result = get_team_compoff_requests(
        current_user['emp_code'],
        status,
        limit
    )
    
    return jsonify(result[0]), result[1]


# ========================================
# UTILITY ENDPOINTS
# ========================================

@compoff_bp.route('/config', methods=['GET'])
@token_required
def get_config(current_user):
    """
    Get comp-off configuration and business rules
    
    Returns current configuration values:
    - Thresholds for half-day and full-day comp-offs
    - Recording window (30 days)
    - Expiry period (90 days)
    - CMD approval threshold (> 3 requests/month)
    """
    return jsonify({
        "success": True,
        "data": {
            "thresholds": {
                "half_day_hours": 3.0,
                "full_day_hours": 6.0,
                "description": "> 3 hours = 0.5 day, > 6 hours = 1 day"
            },
            "recording_window_days": 30,
            "expiry_days": 90,
            "cmd_approval_threshold": 3,
            "rules": {
                "working_days": "Comp-off from SECOND clock-in onwards (excludes weekends, 2nd/4th Saturdays, holidays)",
                "non_working_days": "Comp-off from FIRST clock-in (weekends, holidays) - ALL hours count as extra!",
                "recording_deadline": "Must request within 30 days of work date",
                "expiry": "Comp-offs expire after 90 days if not used",
                "cmd_approval": "More than 3 requests in a month requires CMD approval"
            }
        }
    }), 200


@compoff_bp.route('/statistics', methods=['GET'])
@token_required
def statistics(current_user):
    """
    Get comp-off statistics for the employee
    
    Returns:
    - Monthly breakdown
    - Year-to-date summary
    - Utilization rate
    """
    from services.compoff_service import get_compoff_statistics
    
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    result = get_compoff_statistics(
        current_user['emp_code'],
        year,
        month
    )
    
    return jsonify(result[0]), result[1]