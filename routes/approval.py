"""
Activity Approval Routes
Manager approval system for late arrival and early leave requests
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.activity_approval_service import (
    request_late_arrival_approval,
    request_early_leave_approval,
    approve_activity_request,
    get_my_approval_requests,
    get_team_approval_requests
)

approvals_bp = Blueprint('approvals', __name__)


@approvals_bp.route('/late-arrival/request', methods=['POST'])
@token_required
def request_late_arrival(current_user):
    """
    Request manager approval for late arrival
    
    Workflow:
        1. Employee creates late_arrival activity via /api/activity/start
        2. Employee requests approval using activity_id from step 1
        3. Approval request sent to assigned manager
        4. Manager reviews and approves/rejects
    
    Request Body:
        {
            "activity_id": 123,                    // required - late_arrival activity ID
            "reason": "Traffic jam",               // required
            "notes": "Expected arrival 10:30 AM"   // optional
        }
    
    Example:
        POST /api/approvals/late-arrival/request
        {
            "activity_id": 45,
            "reason": "Traffic jam on ORR",
            "notes": "Expected arrival at 10:30 AM"
        }
    
    Response:
        {
            "success": true,
            "message": "Late arrival approval requested",
            "data": {
                "approval_id": 12,
                "activity_id": 45,
                "manager": "Rajesh Kumar",
                "manager_email": "rajesh@example.com",
                "status": "pending"
            }
        }
    """
    data = request.get_json()
    
    activity_id = data.get('activity_id')
    reason = data.get('reason')
    notes = data.get('notes', '')
    
    if not activity_id or not reason:
        return jsonify({
            "success": False,
            "message": "activity_id and reason are required"
        }), 400
    
    result = request_late_arrival_approval(
        current_user['emp_code'],
        activity_id,
        reason,
        notes
    )
    
    return jsonify(result[0]), result[1]


@approvals_bp.route('/early-leave/request', methods=['POST'])
@token_required
def request_early_leave(current_user):
    """
    Request manager approval for early leave
    
    Workflow:
        1. Employee creates early_leave activity via /api/activity/start
        2. Employee requests approval using activity_id from step 1
        3. Approval request sent to assigned manager
        4. Manager reviews and approves/rejects
    
    Request Body:
        {
            "activity_id": 123,                    // required - early_leave activity ID
            "reason": "Medical emergency",         // required
            "notes": "Expected leave time 3:00 PM" // optional
        }
    
    Example:
        POST /api/approvals/early-leave/request
        {
            "activity_id": 46,
            "reason": "Medical emergency",
            "notes": "Doctor appointment at 3:30 PM"
        }
    
    Response:
        {
            "success": true,
            "message": "Early leave approval requested",
            "data": {
                "approval_id": 13,
                "activity_id": 46,
                "manager": "Rajesh Kumar",
                "manager_email": "rajesh@example.com",
                "status": "pending"
            }
        }
    """
    data = request.get_json()
    
    activity_id = data.get('activity_id')
    reason = data.get('reason')
    notes = data.get('notes', '')
    
    if not activity_id or not reason:
        return jsonify({
            "success": False,
            "message": "activity_id and reason are required"
        }), 400
    
    result = request_early_leave_approval(
        current_user['emp_code'],
        activity_id,
        reason,
        notes
    )
    
    return jsonify(result[0]), result[1]


@approvals_bp.route('/approve', methods=['POST'])
@token_required
def approve_request(current_user):
    """
    Approve or reject late arrival/early leave request
    
    Authorization:
        - Manager only (must be assigned manager for the employee)
        - Request must be in 'pending' status
    
    Request Body:
        {
            "approval_id": 123,                    // required
            "action": "approved",                  // required: "approved" or "rejected"
            "remarks": "Approved, valid reason"    // optional
        }
    
    Example:
        POST /api/approvals/approve
        {
            "approval_id": 12,
            "action": "approved",
            "remarks": "Approved, traffic was bad today"
        }
    
    Response:
        {
            "success": true,
            "message": "Late Arrival request approved",
            "data": {
                "approval_id": 12,
                "activity_id": 45,
                "activity_type": "late_arrival",
                "status": "approved",
                "employee": "John Doe",
                "reviewed_by": "M001",
                "reviewed_at": "2025-01-04 11:00:00"
            }
        }
    """
    data = request.get_json()
    
    approval_id = data.get('approval_id')
    action = data.get('action')
    remarks = data.get('remarks', '')
    
    if not approval_id or not action:
        return jsonify({
            "success": False,
            "message": "approval_id and action are required"
        }), 400
    
    if action not in ['approved', 'rejected']:
        return jsonify({
            "success": False,
            "message": "action must be 'approved' or 'rejected'"
        }), 400
    
    result = approve_activity_request(
        approval_id,
        current_user['emp_code'],
        action,
        remarks
    )
    
    return jsonify(result[0]), result[1]


@approvals_bp.route('/my-requests', methods=['GET'])
@token_required
def my_requests(current_user):
    """
    Get employee's approval request history
    
    Query Params:
        status: pending, approved, rejected (optional)
    
    Example:
        GET /api/approvals/my-requests?status=pending
    
    Response:
        {
            "success": true,
            "data": {
                "requests": [
                    {
                        "id": 12,
                        "activity_id": 45,
                        "activity_type": "late_arrival",
                        "request_date": "2025-01-04",
                        "reason": "Traffic jam on ORR",
                        "notes": "Expected arrival at 10:30 AM",
                        "status": "pending",
                        "requested_at": "2025-01-04 09:45:00",
                        "manager_code": "M001",
                        "manager_email": "rajesh@example.com",
                        "reviewed_by": null,
                        "reviewed_at": null,
                        "manager_remarks": null
                    }
                ],
                "count": 1
            }
        }
    """
    status = request.args.get('status')
    
    result = get_my_approval_requests(current_user['emp_code'], status)
    return jsonify(result[0]), result[1]


@approvals_bp.route('/team-requests', methods=['GET'])
@token_required
def team_requests(current_user):
    """
    Get approval requests for manager's team
    
    Authorization:
        - Manager only
        - Shows requests where current_user is the assigned manager
    
    Query Params:
        status: pending, approved, rejected (optional)
    
    Example:
        GET /api/approvals/team-requests?status=pending
    
    Response:
        {
            "success": true,
            "data": {
                "requests": [
                    {
                        "id": 12,
                        "activity_id": 45,
                        "emp_code": "E001",
                        "emp_name": "John Doe",
                        "emp_email": "john@example.com",
                        "activity_type": "late_arrival",
                        "request_date": "2025-01-04",
                        "reason": "Traffic jam on ORR",
                        "notes": "Expected arrival at 10:30 AM",
                        "status": "pending",
                        "requested_at": "2025-01-04 09:45:00"
                    },
                    {
                        "id": 13,
                        "activity_id": 46,
                        "emp_code": "E002",
                        "emp_name": "Jane Smith",
                        "emp_email": "jane@example.com",
                        "activity_type": "early_leave",
                        "request_date": "2025-01-04",
                        "reason": "Medical emergency",
                        "notes": "Doctor appointment at 3:30 PM",
                        "status": "pending",
                        "requested_at": "2025-01-04 14:45:00"
                    }
                ],
                "count": 2,
                "pending_count": 2
            }
        }
    """
    status = request.args.get('status')
    
    result = get_team_approval_requests(current_user['emp_code'], status)
    return jsonify(result[0]), result[1]


# ==========================================
# REGISTER IN MAIN APP
# ==========================================
"""
In your main app.py:

from routes.activity_approval_routes import approvals_bp
app.register_blueprint(approvals_bp, url_prefix='/api/approvals')

WORKFLOW:
Employee Flow:
    1. Create activity: POST /api/activity/start {activity_type: "late_arrival"}
    2. Request approval: POST /api/approvals/late-arrival/request {activity_id: X}
    3. Check status: GET /api/approvals/my-requests?status=pending

Manager Flow:
    1. View requests: GET /api/approvals/team-requests?status=pending
    2. Approve/Reject: POST /api/approvals/approve {approval_id: X, action: "approved"}
"""