from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from database.connection import get_db_connection
from services.whatsapp_service import send_leave_notification
from services.leaves_service import (
    apply_leave,
    approve_leave,
    cancel_leave,
    get_my_leaves,
    get_team_leaves,
    get_leave_summary
)

leaves_bp = Blueprint("leaves", __name__)

# =========================================================
# HELPER FUNCTIONS
# =========================================================

def get_employee_by_code(emp_code):
    """
    Fetch employee details using emp_code
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # FIXED: Changed emp_phone to emp_contact
    cur.execute("""
        SELECT emp_code, emp_full_name, emp_contact, emp_manager
        FROM employees
        WHERE emp_code = %s
    """, (emp_code,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    # Handle both dict-like and tuple results
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
        SELECT emp_code, from_date, to_date, leave_type, status
        FROM leaves
        WHERE id = %s
    """, (leave_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    # Handle both dict-like and tuple results
    if hasattr(row, 'keys'):
        return {
            "emp_code": row['emp_code'],
            "from_date": row['from_date'].strftime('%d-%m-%Y') if row['from_date'] else None,
            "to_date": row['to_date'].strftime('%d-%m-%Y') if row['to_date'] else None,
            "leave_type": row['leave_type'],
            "status": row['status']
        }
    else:
        from datetime import date
        return {
            "emp_code": row[0],
            "from_date": row[1].strftime('%d-%m-%Y') if isinstance(row[1], date) else row[1],
            "to_date": row[2].strftime('%d-%m-%Y') if isinstance(row[2], date) else row[2],
            "leave_type": row[3],
            "status": row[4]
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

    if status == 201:  # Success status from apply_leave is 201
        employee = get_employee_by_code(current_user["emp_code"])
        manager = get_manager(current_user["emp_code"])

        if employee and manager and manager.get("phone"):
            try:
                notification_sent = send_leave_notification(
                    phone_number=manager["phone"],
                    title="Leave Request",
                    employee_name=manager["name"],
                    message=f"{employee['name']} has applied for leave.",
                    from_date=data["from_date"],
                    to_date=data["to_date"]
                )
                print(f"Manager notification sent: {notification_sent}")
            except Exception as e:
                print(f"Error sending manager notification: {e}")
        else:
            print(f"Manager not found or missing details. Employee: {employee}, Manager: {manager}")

    return jsonify(result), status


# =========================================================
# APPROVE / REJECT LEAVE (MANAGER → EMPLOYEE)
# =========================================================

@leaves_bp.route("/approve", methods=["POST"])
@token_required
def approve(current_user):
    data = request.get_json()

    result, status = approve_leave(
        leave_id=data["leave_id"],
        manager_code=current_user["emp_code"],
        action=data["action"],   # approve / reject
        remarks=data.get("remarks", "")
    )

    if status == 200:
        # Get full leave details from database
        leave = get_leave_details(data["leave_id"])
        
        if not leave:
            print("Could not fetch leave details")
            return jsonify(result), status

        employee = get_employee_by_code(leave["emp_code"])
        manager = get_employee_by_code(current_user["emp_code"])

        action_text = data["action"].capitalize()

        # Notify Employee
        if employee and employee.get("phone"):
            try:
                emp_notif = send_leave_notification(
                    phone_number=employee["phone"],
                    title="Leave Status Update",
                    employee_name=employee["name"],
                    message=f"Your leave request has been {action_text}.",
                    from_date=leave["from_date"],
                    to_date=leave["to_date"]
                )
                print(f"Employee notification sent: {emp_notif}")
            except Exception as e:
                print(f"Error sending employee notification: {e}")
        else:
            print(f"Employee details missing or no phone: {employee}")

        # Notify Manager (confirmation)
        if manager and manager.get("phone") and employee:
            try:
                mgr_notif = send_leave_notification(
                    phone_number=manager["phone"],
                    title="Leave Action Taken",
                    employee_name=manager["name"],
                    message=f"You have {action_text.lower()} {employee['name']}'s leave.",
                    from_date=leave["from_date"],
                    to_date=leave["to_date"]
                )
                print(f"Manager notification sent: {mgr_notif}")
            except Exception as e:
                print(f"Error sending manager notification: {e}")
        else:
            print(f"Manager details missing or no phone: {manager}")

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
    result, status = get_my_leaves(current_user["emp_code"])
    return jsonify(result), status


# =========================================================
# GET TEAM LEAVES (MANAGER)
# =========================================================

@leaves_bp.route("/team-leaves", methods=["GET"])
@token_required
def team_leaves(current_user):
    result, status = get_team_leaves(current_user["emp_code"])
    return jsonify(result), status


# =========================================================
# LEAVE SUMMARY
# =========================================================

@leaves_bp.route("/summary", methods=["GET"])
@token_required
def summary(current_user):
    result, status = get_leave_summary(current_user["emp_code"])
    return jsonify(result), status