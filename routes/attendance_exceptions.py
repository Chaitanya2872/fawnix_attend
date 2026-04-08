"""
Attendance Exceptions Routes
Handles late arrival and early leave approval requests
"""

import logging

from flask import Blueprint, request, jsonify
from database.connection import get_db_connection, return_connection
from middleware.auth_middleware import token_required
from services.whatsapp_service import send_exception_notification
from services.notification_service import send_push_notification_to_department
from services.attendance_exceptions_service import (
    request_late_arrival_exception,
    request_early_leave_exception,
    approve_exception,
    get_my_exceptions,
    get_team_exceptions,
    auto_detect_late_arrival,
    get_my_late_arrival_records,
    get_my_early_leave_records,
)

exceptions_bp = Blueprint('attendance_exceptions', __name__)
logger = logging.getLogger(__name__)


def _notify_department_team_submission(current_user, exception_data):
    """Notify teammates in the same department when an exception is submitted."""
    department = (current_user.get("emp_department") or "").strip()
    emp_code = (current_user.get("emp_code") or "").strip()
    employee_name = (current_user.get("emp_full_name") or "Employee").strip()
    exception_type = (exception_data.get("exception_type") or "").strip()

    if not department:
        logger.info("Skipping department push notification: emp_department missing for %s", emp_code)
        return

    if exception_type == "late_arrival":
        title = "Team Late Arrival Request"
        body = f"{employee_name} submitted a late arrival request."
    elif exception_type == "early_leave":
        title = "Team Early Leave Request"
        body = f"{employee_name} submitted an early leave request."
    else:
        logger.info("Skipping department push notification: unsupported exception type %s", exception_type)
        return

    push_result = send_push_notification_to_department(
        department,
        title,
        body,
        {
            "type": "team_exception_submitted",
            "exception_type": exception_type,
            "exception_id": exception_data.get("exception_id"),
            "emp_code": emp_code,
            "emp_department": department,
        },
        exclude_emp_code=emp_code,
    )
    if not push_result.get("success"):
        logger.warning(
            "Department exception push notification failed department=%s emp_code=%s exception_id=%s message=%s",
            department,
            emp_code,
            exception_data.get("exception_id"),
            push_result.get("message"),
        )


def _get_employee_contact(emp_code):
    """Fetch employee name and WhatsApp phone number by emp_code."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT emp_code, emp_full_name, emp_contact
            FROM employees
            WHERE emp_code = %s
            """,
            (emp_code,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "emp_code": row["emp_code"],
            "name": row["emp_full_name"],
            "phone": row["emp_contact"],
        }
    finally:
        cursor.close()
        return_connection(conn)


def _send_manager_request_notification(current_user, exception_data, reason):
    """Notify manager/informing-manager when exception request is submitted."""
    manager_code = exception_data.get("manager_code")
    if not manager_code:
        logger.info("Skipping manager notification: manager_code missing")
        return

    manager = _get_employee_contact(manager_code)
    if not manager or not manager.get("phone"):
        logger.info("Skipping manager notification: manager contact missing for %s", manager_code)
        return

    employee_name = current_user.get("emp_full_name") or exception_data.get("employee_name") or "Employee"
    exception_type = exception_data.get("exception_type")

    if exception_type == "late_arrival":
        detail = f"Late by: {exception_data.get('late_by_minutes')} minutes"
        request_label = "late-arrival"
    else:
        detail = f"Planned leave time: {exception_data.get('planned_leave_time')}"
        request_label = "early-leave"

    sent = send_exception_notification(
        phone_number=manager["phone"],
        manager_name=manager["name"],
        employee_name=employee_name,
        exception_type=request_label,
        detail=detail,
        reason=reason,
        status_label="Pending your review",
        title="Attendance Exception"
    )
    logger.info(
        "Manager WhatsApp notification for %s request (exception_id=%s): %s",
        exception_type,
        exception_data.get("exception_id"),
        sent
    )


def _send_employee_decision_notification(exception_data, action, remarks):
    """Notify employee when manager approves/rejects exception request."""
    emp_code = exception_data.get("emp_code")
    if not emp_code:
        logger.info("Skipping employee notification: emp_code missing")
        return

    employee = _get_employee_contact(emp_code)
    if not employee or not employee.get("phone"):
        logger.info("Skipping employee notification: employee contact missing for %s", emp_code)
        return

    exception_type = exception_data.get("exception_type", "").replace("_", " ")
    decision = action.lower()
    message = (
        f"Hello {employee['name']},\n\n"
        f"Your {exception_type} exception request has been {decision}."
    )
    if remarks:
        message += f"\nManager remarks: {remarks}"
    message += "\n\n- Fawnix"

    sent = send_notification(employee["phone"], message)
    logger.info(
        "Employee WhatsApp decision notification for exception_id=%s: %s",
        exception_data.get("exception_id"),
        sent
    )


@exceptions_bp.route('/late-arrival', methods=['POST'])
@token_required
def submit_late_arrival(current_user):
    """
    Submit late arrival exception with reason
    
    This should be called BEFORE clock-in, after shift start time.
    The request creates a pending attendance row immediately so an attendance_id is available
    before the employee performs the actual clock-in.
    
    Request Body:
        {
            "reason": "Traffic jam",   // required
            "notes": "Heavy rain"      // optional
        }
    
    Example:
        POST /api/attendance-exceptions/late-arrival
        {
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
    data = request.get_json() or {}
    
    reason = data.get('reason')
    notes = data.get('notes', '')
    
    if not reason:
        return jsonify({
            "success": False,
            "message": "reason is required"
        }), 400
    
    result = request_late_arrival_exception(
        current_user['emp_code'],
        reason,
        notes
    )

    response_body, status_code = result
    if status_code == 201 and response_body.get("success"):
        try:
            _send_manager_request_notification(current_user, response_body.get("data", {}), reason)
        except Exception:
            logger.exception("Failed to send late arrival WhatsApp notification")
        try:
            _notify_department_team_submission(current_user, response_body.get("data", {}))
        except Exception:
            logger.exception("Failed to send late arrival department push notification")

    return jsonify(response_body), status_code


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
    data = request.get_json() or {}
    
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

    response_body, status_code = result
    if status_code == 201 and response_body.get("success"):
        try:
            _send_manager_request_notification(current_user, response_body.get("data", {}), reason)
        except Exception:
            logger.exception("Failed to send early leave WhatsApp notification")
        try:
            _notify_department_team_submission(current_user, response_body.get("data", {}))
        except Exception:
            logger.exception("Failed to send early leave department push notification")

    return jsonify(response_body), status_code


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
    data = request.get_json() or {}
    
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

    response_body, status_code = result
    if status_code == 200 and response_body.get("success"):
        try:
            _send_employee_decision_notification(response_body.get("data", {}), action, remarks)
        except Exception:
            logger.exception("Failed to send exception decision WhatsApp notification")

    return jsonify(response_body), status_code


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


@exceptions_bp.route('/my-late-arrivals', methods=['GET'])
@token_required
def my_late_arrivals(current_user):
    """
    Get the logged-in employee's late arrival exceptions.

    Query Params:
        status: pending, approved, rejected (optional)

    Example:
        GET /api/attendance-exceptions/my-late-arrivals?status=approved
    """
    status = request.args.get('status')

    result = get_my_late_arrival_records(current_user['emp_code'], status)

    return jsonify(result[0]), result[1]


@exceptions_bp.route('/my-early-leaves', methods=['GET'])
@token_required
def my_early_leaves(current_user):
    """
    Get the logged-in employee's early leave exceptions.

    Query Params:
        status: pending, approved, rejected (optional)

    Example:
        GET /api/attendance-exceptions/my-early-leaves?status=pending
    """
    status = request.args.get('status')

    result = get_my_early_leave_records(current_user['emp_code'], status)

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
    1. User becomes late after shift start
    2. User submits: POST /api/attendance-exceptions/late-arrival
    3. Manager reviews: GET /api/attendance-exceptions/team-exceptions
    4. Manager approves: POST /api/attendance-exceptions/approve
    5. System creates a pending attendance row and returns attendance_id
    6. User clocks in
    7. System updates that same attendance row with the real clock-in details

Early Leave Flow:
    1. User wants to leave early
    2. User submits request: POST /api/attendance-exceptions/early-leave
    3. Manager approves/rejects
    4. If approved, user can clock out early (clock_out checks for approval)
    5. If not approved, clock_out blocks early exit
"""
