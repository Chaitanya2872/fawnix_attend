"""
Attendance Exceptions Routes
Handles late arrival and early leave approval requests
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.attendance_exceptions_service import (
    request_late_arrival_exception,
    request_early_leave_exception,
    approve_exception,
    get_my_exceptions,
    get_team_exceptions,
    auto_detect_late_arrival
)

exceptions_bp = Blueprint('attendance_exceptions', __name__)


@exceptions_bp.route('/late-arrival', methods=['POST'])
@token_required
def submit_late_arrival(current_user):
    """
    Submit late arrival exception with reason
    
    This should be called AFTER clock-in when user is prompted for late arrival reason.
    The system auto-detects late arrival during clock-in.
    
    Request Body:
        {
            "attendance_id": 123,      // required - current attendance session ID
            "reason": "Traffic jam",   // required
            "notes": "Heavy rain"      // optional
        }
    
    Example:
        POST /api/attendance-exceptions/late-arrival
        {
            "attendance_id": 45,
            "reason": "Traffic jam on ORR",
            "notes": "Heavy rain caused 30 min delay"
        }
    
    Response:
        {
            "success": true,
            "message": "Late arrival exception submitted",
            "data": {
                "exception_id": 12,
                "attendance_id": 45,
                "exception_type": "late_arrival",
                "late_by_minutes": 25,
                "manager": "Rajesh Kumar",
                "status": "pending"
            }
        }
    """
    data = request.get_json()
    
    attendance_id = data.get('attendance_id')
    reason = data.get('reason')
    notes = data.get('notes', '')
    
    if not attendance_id or not reason:
        return jsonify({
            "success": False,
            "message": "attendance_id and reason are required"
        }), 400
    
    result = request_late_arrival_exception(
        current_user['emp_code'],
        attendance_id,
        reason,
        notes
    )
    
    return jsonify(result[0]), result[1]


@exceptions_bp.route('/early-leave', methods=['POST'])
@token_required
def submit_early_leave(current_user):
    """
    Submit early leave exception request
    
    Must be submitted BEFORE clocking out early.
    User cannot clock out early without approval.
    
    Request Body:
        {
            "attendance_id": 123,               // required - current attendance session
            "planned_leave_time": "15:00",      // required - HH:MM format
            "reason": "Medical emergency",      // required
            "notes": "Doctor appointment"       // optional
        }
    
    Example:
        POST /api/attendance-exceptions/early-leave
        {
            "attendance_id": 45,
            "planned_leave_time": "15:00",
            "reason": "Medical emergency",
            "notes": "Doctor appointment at 3:30 PM"
        }
    
    Response:
        {
            "success": true,
            "message": "Early leave exception submitted",
            "data": {
                "exception_id": 13,
                "attendance_id": 45,
                "exception_type": "early_leave",
                "planned_leave_time": "15:00",
                "early_by_minutes": 120,
                "manager": "Rajesh Kumar",
                "status": "pending"
            }
        }
    """
    data = request.get_json()
    
    attendance_id = data.get('attendance_id')
    planned_leave_time = data.get('planned_leave_time')
    reason = data.get('reason')
    notes = data.get('notes', '')
    
    if not attendance_id or not planned_leave_time or not reason:
        return jsonify({
            "success": False,
            "message": "attendance_id, planned_leave_time, and reason are required"
        }), 400
    
    result = request_early_leave_exception(
        current_user['emp_code'],
        attendance_id,
        planned_leave_time,
        reason,
        notes
    )
    
    return jsonify(result[0]), result[1]


@exceptions_bp.route('/approve', methods=['POST'])
@token_required
def approve_exception_request(current_user):
    """
    Approve or reject attendance exception
    
    Authorization:
        - Manager only (must be assigned manager for the employee)
        - Exception must be in 'pending' status
    
    Request Body:
        {
            "exception_id": 123,                    // required
            "action": "approved",                   // required: "approved" or "rejected"
            "remarks": "Approved, valid reason"     // optional
        }
    
    Example:
        POST /api/attendance-exceptions/approve
        {
            "exception_id": 12,
            "action": "approved",
            "remarks": "Approved, traffic was bad today"
        }
    
    Response:
        {
            "success": true,
            "message": "Late arrival exception approved",
            "data": {
                "exception_id": 12,
                "exception_type": "late_arrival",
                "status": "approved",
                "employee": "John Doe",
                "reviewed_by": "M001",
                "reviewed_at": "2025-01-04 11:00:00"
            }
        }
    """
    data = request.get_json()
    
    exception_id = data.get('exception_id')
    action = data.get('action')
    remarks = data.get('remarks', '')
    
    if not exception_id or not action:
        return jsonify({
            "success": False,
            "message": "exception_id and action are required"
        }), 400
    
    if action not in ['approved', 'rejected']:
        return jsonify({
            "success": False,
            "message": "action must be 'approved' or 'rejected'"
        }), 400
    
    result = approve_exception(
        exception_id,
        current_user['emp_code'],
        action,
        remarks
    )
    
    return jsonify(result[0]), result[1]


@exceptions_bp.route('/my-exceptions', methods=['GET'])
@token_required
def my_exceptions(current_user):
    """
    Get employee's attendance exception history
    
    Query Params:
        status: pending, approved, rejected (optional)
        type: late_arrival, early_leave (optional)
    
    Example:
        GET /api/attendance-exceptions/my-exceptions?status=pending
    
    Response:
        {
            "success": true,
            "data": {
                "exceptions": [
                    {
                        "id": 12,
                        "attendance_id": 45,
                        "exception_type": "late_arrival",
                        "exception_time": "09:25:00",
                        "late_by_minutes": 25,
                        "reason": "Traffic jam",
                        "status": "pending",
                        "requested_at": "2025-01-04 09:30:00"
                    }
                ],
                "count": 1,
                "summary": {
                    "pending": 1,
                    "approved": 5,
                    "rejected": 0
                }
            }
        }
    """
    status = request.args.get('status')
    exception_type = request.args.get('type')
    
    result = get_my_exceptions(
        current_user['emp_code'],
        status,
        exception_type
    )
    
    return jsonify(result[0]), result[1]


@exceptions_bp.route('/team-exceptions', methods=['GET'])
@token_required
def team_exceptions(current_user):
    """
    Get attendance exceptions for manager's team
    
    Authorization:
        - Manager only
        - Shows exceptions where current_user is the assigned manager
    
    Query Params:
        status: pending, approved, rejected (optional)
        type: late_arrival, early_leave (optional)
    
    Example:
        GET /api/attendance-exceptions/team-exceptions?status=pending
    
    Response:
        {
            "success": true,
            "data": {
                "exceptions": [
                    {
                        "id": 12,
                        "emp_code": "E001",
                        "emp_name": "John Doe",
                        "exception_type": "late_arrival",
                        "exception_time": "09:25:00",
                        "late_by_minutes": 25,
                        "reason": "Traffic jam",
                        "status": "pending",
                        "requested_at": "2025-01-04 09:30:00"
                    },
                    {
                        "id": 13,
                        "emp_code": "E002",
                        "emp_name": "Jane Smith",
                        "exception_type": "early_leave",
                        "planned_leave_time": "15:00",
                        "early_by_minutes": 120,
                        "reason": "Medical emergency",
                        "status": "pending",
                        "requested_at": "2025-01-04 14:00:00"
                    }
                ],
                "count": 2,
                "pending_count": 2
            }
        }
    """
    status = request.args.get('status')
    exception_type = request.args.get('type')
    
    result = get_team_exceptions(
        current_user['emp_code'],
        status,
        exception_type
    )
    
    return jsonify(result[0]), result[1]


# ==========================================
# REGISTER IN MAIN APP
# ==========================================
"""
In your main app.py:

from routes.attendance_exceptions import exceptions_bp
app.register_blueprint(exceptions_bp, url_prefix='/api/attendance-exceptions')

WORKFLOW:

Late Arrival Flow:
    1. User clocks in late
    2. System detects late arrival (in clock_in function)
    3. Frontend prompts user for reason
    4. User submits: POST /api/attendance-exceptions/late-arrival
    5. Manager reviews: GET /api/attendance-exceptions/team-exceptions
    6. Manager approves: POST /api/attendance-exceptions/approve

Early Leave Flow:
    1. User wants to leave early
    2. User submits request: POST /api/attendance-exceptions/early-leave
    3. Manager approves/rejects
    4. If approved, user can clock out early (clock_out checks for approval)
    5. If not approved, clock_out blocks early exit
"""