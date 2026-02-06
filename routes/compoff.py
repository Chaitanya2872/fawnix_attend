"""
Enhanced Comp-off Routes
API endpoints for overtime tracking and comp-off management with multi-level approval
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.CompLeaveService import (
    trigger_compoff_calculation,
    get_employee_overtime_records,
    request_compoff,
    get_my_compoff_requests,
    approve_compoff_request,
    cancel_compoff_request,
    get_compoff_balance,
    get_team_compoff_requests,
    get_compoff_statistics,
    scan_attendance_and_create_overtime_records
)
from datetime import datetime

compoff_bp = Blueprint('compoff', __name__)


# ========================================
# NEW API: SCAN ATTENDANCE AND CREATE OVERTIME RECORDS
# ========================================

@compoff_bp.route('/scan-attendance', methods=['POST'])
@token_required
def scan_attendance(current_user):
    """
    Scan attendance records and create overtime records
    
    This API reads attendance records and pushes them to overtime_records table
    based on shift times and working day rules.
    
    Use Cases:
    1. Backfill missing overtime records
    2. Recalculate comp-offs for a date range
    3. Process specific employee or all employees (admin only)
    
    Request Body (all optional):
    {
        "emp_code": "EMP001",           // Specific employee (defaults to current user)
        "start_date": "2024-01-01",     // Start date (defaults to 30 days back)
        "end_date": "2024-01-31",       // End date (defaults to today)
        "days_back": 30                 // Days to look back if dates not specified
    }
    
    Authorization:
    - Regular users: Can only scan their own records
    - HR/CMD/Admin: Can scan any employee or all employees
    
    Business Logic Applied:
    1. Non-working days (holidays/Sundays/2nd-4th Saturdays): ALL hours = overtime
    2. Working days - First clock-in: Only hours outside shift time = overtime
    3. Working days - Second+ clock-in: ALL hours = overtime
    4. > 3 extra hours = 0.5 day comp-off
    5. > 6 extra hours = 1 day comp-off
    
    Returns:
    - Summary of records scanned and created
    - List of created overtime records (up to 50)
    - Error details if any
    
    Example Response:
    {
        "success": true,
        "message": "Successfully scanned 45 attendance records",
        "data": {
            "date_range": {
                "start_date": "2024-01-01",
                "end_date": "2024-01-31"
            },
            "summary": {
                "total_attendance_records": 45,
                "processed": 45,
                "created": 12,
                "skipped": 30,
                "errors": 3
            },
            "created_records": [...]
        }
    }
    """
    data = request.get_json() or {}
    
    # Get parameters
    emp_code = data.get('emp_code')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    days_back = data.get('days_back', 30)
    
    # Parse dates
    start_date = None
    end_date = None
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except:
            return jsonify({
                "success": False,
                "message": "Invalid start_date format. Use YYYY-MM-DD"
            }), 400
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except:
            return jsonify({
                "success": False,
                "message": "Invalid end_date format. Use YYYY-MM-DD"
            }), 400
    
    # Authorization check
    user_role = current_user.get('emp_designation', '').upper()
    current_emp_code = current_user['emp_code']
    
    # If emp_code not specified, use current user
    if not emp_code:
        emp_code = current_emp_code
    
    # Check if user can scan other employees
    if emp_code != current_emp_code and user_role not in ['HR', 'CMD', 'ADMIN']:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only scan your own attendance records."
        }), 403
    
    # Admin/HR/CMD can scan all employees by not passing emp_code
    if user_role in ['HR', 'CMD', 'ADMIN'] and data.get('scan_all_employees'):
        emp_code = None  # Scan all employees
    
    # Call service function
    result = scan_attendance_and_create_overtime_records(
        emp_code=emp_code,
        start_date=start_date,
        end_date=end_date,
        days_back=days_back
    )
    
    return jsonify(result[0]), result[1]


# ========================================
# EXISTING ENDPOINTS (Enhanced)
# ========================================

@compoff_bp.route('/overtime-records', methods=['GET'])
@token_required
def overtime_records(current_user):
    """
    Get employee's overtime records
    
    AUTOMATICALLY TRIGGERS: Comp-off calculation on every API call
    - Scans recent attendance records
    - Calculates comp-off days based on extra hours
    - Creates overtime records if missing
    
    Query Params:
    - status: eligible, requested, approved, rejected, expired, utilized (optional)
    - limit: number of records (default: 50)
    
    Returns:
    - List of overtime records with comp-off days
    - Summary of eligible, pending, and approved comp-offs
    - Trigger execution summary
    
    Example: /api/compoff/overtime-records?status=eligible&limit=20
    """
    # STEP 1: TRIGGER comp-off calculation automatically
    trigger_result = trigger_compoff_calculation(current_user['emp_code'])
    trigger_data = trigger_result[0] if trigger_result[1] == 200 else None
    
    # STEP 2: Get overtime records after trigger
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    result = get_employee_overtime_records(
        current_user['emp_code'],
        status,
        limit
    )
    
    # STEP 3: Merge trigger info with records response
    response_data = result[0]
    if trigger_data and 'data' in response_data:
        response_data['data']['trigger_info'] = trigger_data.get('data', {})
    
    return jsonify(response_data), result[1]


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
    4. If > 3 comp-offs in current month, requires HR/CMD approval
    
    Approval Levels:
    - <= 3 requests this month: Manager approval (approval_level = 'manager')
    - > 3 requests this month: HR/CMD approval (approval_level = 'cmd')
    
    Returns:
    - Request ID
    - Total comp-off days
    - Approval level (manager/cmd)
    - Status
    - Month request count
    
    Example Response:
    {
        "success": true,
        "message": "Comp-off request submitted. This is your 4th request this month. Requires HR/CMD approval.",
        "data": {
            "request_id": 123,
            "total_comp_days": 1.5,
            "overtime_records_count": 3,
            "approval_level": "cmd",
            "approver": "MGR001",
            "month_request_count": 4,
            "status": "pending"
        }
    }
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
    - Approval level and status
    - Reviewer information
    
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
    - HR/CMD: Can approve both 'manager' and 'cmd' level requests
    
    Request Body:
    {
        "request_id": 123,                    // required
        "action": "approved",                 // required: "approved" or "rejected"
        "remarks": "Approved for good work"   // optional
    }
    
    Business Rule:
    - If employee has > 3 comp-off requests in current month,
      approval_level will be 'cmd' and requires HR/CMD approval
    - Otherwise, approval_level is 'manager' and requires Manager approval
    
    Returns:
    - Updated request status
    - Comp-off days approved/rejected
    - Approver details
    
    Example Response:
    {
        "success": true,
        "message": "Comp-off request approved successfully",
        "data": {
            "request_id": 123,
            "status": "approved",
            "total_comp_days": 1.5,
            "approver": "HR001",
            "approver_designation": "HR",
            "approved_at": "2024-02-06 15:30:00"
        }
    }
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
    
    Authorization: Manager, HR, CMD
    
    Query Params:
    - status: pending, approved, rejected (optional)
    - limit: number of records (default: 50)
    
    Returns:
    - List of team members' comp-off requests
    - Approval level and priority indicators
    - Manager's designation
    
    Example Response:
    {
        "success": true,
        "data": {
            "requests": [...],
            "count": 10,
            "manager_designation": "HR"
        }
    }
    """
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    # Check if user is a manager or admin
    user_role = current_user.get('emp_designation', '').upper()
    if user_role not in ['MANAGER', 'HR', 'CMD', 'ADMIN']:
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
    - Working hours (shift times)
    - Thresholds for half-day and full-day comp-offs
    - Recording window (30 days)
    - Expiry period (90 days)
    - HR/CMD approval threshold (> 3 requests/month)
    """
    return jsonify({
        "success": True,
        "data": {
            "working_hours": {
                "monday_to_friday": "10:00 AM - 6:30 PM (8.5 hours)",
                "working_saturdays": "10:00 AM - 1:30 PM (3.5 hours) - 1st, 3rd, 5th Saturdays",
                "non_working_days": "2nd, 4th Saturdays, Sundays, Organization Holidays"
            },
            "overtime_calculation": {
                "non_working_days": "ALL hours count as overtime",
                "working_days_first_clockin": "Only hours outside shift time (early start/late finish) count",
                "working_days_second_clockin": "ALL hours count as overtime"
            },
            "thresholds": {
                "half_day_hours": 3.0,
                "full_day_hours": 6.0,
                "description": "> 3 extra hours = 0.5 day, > 6 extra hours = 1 day"
            },
            "approval_levels": {
                "manager": "For <= 3 comp-off requests in current month",
                "hr_cmd": "For > 3 comp-off requests in current month"
            },
            "recording_window_days": 30,
            "expiry_days": 90,
            "hr_cmd_approval_threshold": 3
        }
    }), 200


@compoff_bp.route('/statistics', methods=['GET'])
@token_required
def statistics(current_user):
    """
    Get comp-off statistics for the employee
    
    Query Params:
    - year: Year (optional, defaults to current year)
    - month: Month (optional, 1-12)
    
    Returns:
    - Monthly breakdown
    - Year-to-date summary
    - Utilization rate
    """
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    result = get_compoff_statistics(
        current_user['emp_code'],
        year,
        month
    )
    
    return jsonify(result[0]), result[1]