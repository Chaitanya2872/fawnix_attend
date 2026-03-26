from flask import Blueprint, request, jsonify
import logging
from middleware.auth_middleware import token_required
from database.connection import get_db_connection, return_connection
from services.whatsapp_service import send_leave_notification
from services.notification_service import send_push_notification_to_employee
from services import admin_service
from services.leaves_service import (
    apply_leave,
    approve_leave,
    cancel_leave,
    get_my_leaves,
    get_team_leaves,
    get_leave_summary
)

leaves_bp = Blueprint("leaves", __name__)
logger = logging.getLogger(__name__)


def _is_privileged(current_user) -> bool:
    designation = (current_user.get("emp_designation") or "").strip().lower()
    department = (current_user.get("emp_department") or "").strip().lower()
    return designation in ["hr", "cmd", "admin"] or department == "hr"

# =========================================================
# HELPER FUNCTIONS
# =========================================================

def get_employee_by_code(emp_code):
    """
    Fetch employee details using emp_code
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT emp_code, emp_full_name, emp_contact, emp_manager
        FROM employees
        WHERE emp_code = %s
    """, (emp_code,))

    row = cur.fetchone()
    cur.close()
    return_connection(conn)

    if not row:
        return None

    if hasattr(row, 'keys'):
        return {
            "emp_code": row['emp_code'],
            "name": row['emp_full_name'],
            "phone": row['emp_contact'],
            "manager_code": row['emp_manager']
        }
    else:
        return {
            "emp_code": row[0],
            "name": row[1],
            "phone": row[2],
            "manager_code": row[3]
        }


def get_manager(emp_code):
    """
    Fetch manager using employee's emp_manager field
    """
    employee = get_employee_by_code(emp_code)
    if not employee or not employee["manager_code"]:
        return None

    return get_employee_by_code(employee["manager_code"])


def get_leave_details(leave_id):
    """
    Fetch complete leave details by leave_id
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT emp_code, from_date, to_date, leave_type, status, leave_count, notes
        FROM leaves
        WHERE id = %s
    """, (leave_id,))

    row = cur.fetchone()
    cur.close()
    return_connection(conn)

    if not row:
        return None

    if hasattr(row, 'keys'):
        return {
            "emp_code": row['emp_code'],
            "from_date": row['from_date'].strftime('%d-%m-%Y') if row['from_date'] else None,
            "to_date": row['to_date'].strftime('%d-%m-%Y') if row['to_date'] else None,
            "leave_type": row['leave_type'],
            "status": row['status'],
            "leave_count": float(row['leave_count']) if row.get('leave_count') is not None else None,
            "notes": row.get('notes', '')
        }
    else:
        from datetime import date
        return {
            "emp_code": row[0],
            "from_date": row[1].strftime('%d-%m-%Y') if isinstance(row[1], date) else row[1],
            "to_date": row[2].strftime('%d-%m-%Y') if isinstance(row[2], date) else row[2],
            "leave_type": row[3],
            "status": row[4],
            "leave_count": float(row[5]) if row[5] is not None else None,
            "notes": row[6] if len(row) > 6 and row[6] else ''
        }


# =========================================================
# APPLY LEAVE (EMPLOYEE → MANAGER NOTIFICATION)
# =========================================================

@leaves_bp.route("/apply", methods=["POST"])
@token_required
def apply(current_user):
    data = request.get_json()

    result, status = apply_leave(
        emp_code=current_user["emp_code"],
        from_date=data["from_date"],
        to_date=data["to_date"],
        leave_type=data["leave_type"],
        duration=data["duration"],
        notes=data.get("notes", "")
    )

    if status == 201:
        employee = get_employee_by_code(current_user["emp_code"])
        manager = get_manager(current_user["emp_code"])
        leave_data = result.get("data", {}) if isinstance(result, dict) else {}
        approver_code = leave_data.get("approver_code")

        if employee and manager and manager.get("phone"):
            try:
                # Notify manager: "{Employee} has requested leave..."
                notification_sent = send_leave_notification(
                    phone_number=manager["phone"],
                    title="Leave Request",
                    employee_name=manager["name"],        # recipient (manager)
                    message=employee["name"],             # not used directly; kept for legacy
                    from_date=data["from_date"],
                    to_date=data["to_date"],
                    notification_type="submission",
                    number_of_days=leave_data.get("leave_count"),
                    reason=data.get("notes", ""),
                    subject_employee_name=employee["name"]  # employee who applied
                )
                logger.info(
                    "Manager leave-request WhatsApp notification sent=%s manager=%s employee=%s",
                    notification_sent,
                    manager["emp_code"],
                    employee["emp_code"]
                )
            except Exception as e:
                logger.exception("Error sending manager leave-request notification: %s", e)
        else:
            logger.warning(
                "Manager not found or missing details for leave apply. employee=%s manager=%s",
                employee,
                manager
            )

        if approver_code:
            try:
                push_result = send_push_notification_to_employee(
                    approver_code,
                    "New Leave Request",
                    "A new leave request is waiting for your approval.",
                    {
                        "type": "leave_submitted",
                        "leave_id": leave_data.get("leave_id"),
                    },
                )
                if not push_result.get("success"):
                    logger.warning(
                        "Manager leave-request push notification failed approver=%s leave_id=%s message=%s",
                        approver_code,
                        leave_data.get("leave_id"),
                        push_result.get("message"),
                    )
            except Exception as e:
                logger.exception("Error sending manager leave-request push notification: %s", e)
        else:
            logger.warning("Approver code missing for leave apply push. employee=%s", current_user["emp_code"])

    return jsonify(result), status


# =========================================================
# APPROVE / REJECT LEAVE (MANAGER → EMPLOYEE + MANAGER CONFIRM)
# =========================================================

@leaves_bp.route("/approve", methods=["POST"])
@token_required
def approve(current_user):
    data = request.get_json()

    result, status = approve_leave(
        leave_id=data["leave_id"],
        manager_code=current_user["emp_code"],
        action=data["action"],   # "approve" / "reject"
        remarks=data.get("remarks", "")
    )

    if status == 200:
        leave = get_leave_details(data["leave_id"])

        if not leave:
            logger.warning("Could not fetch leave details for leave_id=%s", data["leave_id"])
            return jsonify(result), status

        employee = get_employee_by_code(leave["emp_code"])
        manager = get_employee_by_code(current_user["emp_code"])
        leave_status = (result.get("data", {}) if isinstance(result, dict) else {}).get("status")

        # Normalise action string, e.g. "approve" → "approved", "reject" → "rejected"
        raw_action = data["action"].lower().strip()
        action_past_tense = raw_action + "d" if not raw_action.endswith("e") else raw_action + "d"
        # Simpler mapping to be safe:
        action_map = {"approve": "approved", "reject": "rejected", "cancel": "cancelled"}
        action_label = action_map.get(raw_action, raw_action)

        # --- Notify Employee: "Your leave has been approved/rejected" ---
        if employee and employee.get("phone"):
            try:
                emp_notif = send_leave_notification(
                    phone_number=employee["phone"],
                    title="Leave Status Update",
                    employee_name=employee["name"],       # recipient (employee)
                    message=action_label,                 # "approved" / "rejected"
                    from_date=leave["from_date"],
                    to_date=leave["to_date"],
                    notification_type="decision",
                    number_of_days=leave.get("leave_count")
                )
                logger.info(
                    "Employee leave-status WhatsApp notification sent=%s employee=%s",
                    emp_notif,
                    employee["emp_code"]
                )
            except Exception as e:
                logger.exception("Error sending employee leave-status notification: %s", e)
        else:
            logger.warning("Employee details missing or no phone. employee=%s", employee)

        if employee:
            try:
                push_title = "Leave Approved" if leave_status == "approved" else "Leave Rejected"
                push_body = (
                    "Your leave request has been approved."
                    if leave_status == "approved"
                    else "Your leave request has been rejected."
                )
                push_result = send_push_notification_to_employee(
                    employee["emp_code"],
                    push_title,
                    push_body,
                    {
                        "type": "leave_status_updated",
                        "leave_id": data["leave_id"],
                    },
                )
                if not push_result.get("success"):
                    logger.warning(
                        "Employee leave-status push notification failed employee=%s leave_id=%s message=%s",
                        employee["emp_code"],
                        data["leave_id"],
                        push_result.get("message"),
                    )
            except Exception as e:
                logger.exception("Error sending employee leave-status push notification: %s", e)

        # --- Notify Manager: "You have approved/rejected {Employee}'s leave" ---
        if manager and manager.get("phone") and employee:
            try:
                mgr_notif = send_leave_notification(
                    phone_number=manager["phone"],
                    title="Leave Action Taken",
                    employee_name=manager["name"],           # recipient (manager)
                    message=action_label,                    # "approved" / "rejected"
                    from_date=leave["from_date"],
                    to_date=leave["to_date"],
                    notification_type="manager_action",
                    number_of_days=leave.get("leave_count"),
                    subject_employee_name=employee["name"]   # employee whose leave was actioned
                )
                logger.info(
                    "Manager leave-action WhatsApp notification sent=%s manager=%s",
                    mgr_notif,
                    manager["emp_code"]
                )
            except Exception as e:
                logger.exception("Error sending manager leave-action notification: %s", e)
        else:
            logger.warning("Manager details missing or no phone. manager=%s", manager)

    return jsonify(result), status


# =========================================================
# CANCEL LEAVE
# =========================================================

@leaves_bp.route("/cancel", methods=["POST"])
@token_required
def cancel(current_user):
    data = request.get_json()
    result, status = cancel_leave(data["leave_id"], current_user["emp_code"])
    return jsonify(result), status


# =========================================================
# GET MY LEAVES
# =========================================================

@leaves_bp.route("/my-leaves", methods=["GET"])
@token_required
def my_leaves(current_user):
    status = request.args.get("status")
    limit = request.args.get("limit", 50, type=int)
    emp_code = request.args.get("emp_code")
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")

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

    if _is_privileged(current_user):
        if not emp_code:
            result, status_code = admin_service.get_all_leaves(
                limit=limit,
                status=status,
                emp_code=emp_code,
                from_date=from_date,
                to_date=to_date
            )
            return jsonify(result), status_code

        result, status_code = get_my_leaves(emp_code, status=status, limit=limit)
        return jsonify(result), status_code
    elif emp_code:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your own leaves."
        }), 403

    result, status = get_my_leaves(current_user["emp_code"], status=status, limit=limit)
    return jsonify(result), status


# =========================================================
# GET TEAM LEAVES (MANAGER)
# =========================================================

@leaves_bp.route("/team-leaves", methods=["GET"])
@token_required
def team_leaves(current_user):
    status = request.args.get("status")
    limit = request.args.get("limit", 50, type=int)
    emp_code = request.args.get("emp_code")
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")

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

    if _is_privileged(current_user):
        if not emp_code:
            result, status_code = admin_service.get_all_leaves(
                limit=limit,
                status=status,
                emp_code=emp_code,
                from_date=from_date,
                to_date=to_date
            )
            return jsonify(result), status_code

        result, status_code = get_my_leaves(emp_code, status=status, limit=limit)
        return jsonify(result), status_code
    elif emp_code:
        return jsonify({
            "success": False,
            "message": "Unauthorized. You can only view your team leaves."
        }), 403

    result, status = get_team_leaves(current_user["emp_code"], status=status, limit=limit)
    return jsonify(result), status


# =========================================================
# LEAVE SUMMARY
# =========================================================

@leaves_bp.route("/summary", methods=["GET"])
@token_required
def summary(current_user):
    emp_code = request.args.get("emp_code")

    if _is_privileged(current_user) and emp_code:
        result, status = get_leave_summary(emp_code)
    else:
        result, status = get_leave_summary(current_user["emp_code"])
    return jsonify(result), status
