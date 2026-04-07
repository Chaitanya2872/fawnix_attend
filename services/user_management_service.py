"""
User Management Service
Handles employee create and delete operations.
"""

import logging
from datetime import datetime

from config import UserRole
from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

ALLOWED_MANAGEMENT_ROLES = {"admin", "user_manager", "hr" }
ALLOWED_MANAGEMENT_DESIGNATIONS = {"devtester"}


def can_manage_users(current_user: dict) -> bool:
    """Check if current user can create/delete employees."""
    role = (current_user.get("role") or "").strip().lower()
    if role in ALLOWED_MANAGEMENT_ROLES:
        return True

    designation = (current_user.get("emp_designation") or "").strip().lower()
    return designation in ALLOWED_MANAGEMENT_DESIGNATIONS


def _serialize_row(row: dict) -> dict:
    """Convert datetime values to string for API responses."""
    if not row:
        return row
    for key, value in row.items():
        if isinstance(value, datetime):
            row[key] = value.strftime("%Y-%m-%d %H:%M:%S")
    return row


def _get_employee_columns(cursor):
    """Get metadata for employees table columns."""
    cursor.execute(
        """
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employees'
        ORDER BY ordinal_position
        """
    )
    rows = cursor.fetchall()
    return {row["column_name"]: row for row in rows}


def _normalize_employee_payload(payload: dict, columns_meta: dict):
    """
    Normalize/validate employee payload for create API.
    API convention:
    - Accept `emp_joined_date` only from client
    - Support `emp_shift_id` and `emp_grade`
    """
    normalized = dict(payload)

    if "emp_joining_date" in normalized:
        return None, (
            {
                "success": False,
                "message": "Use 'emp_joined_date' only (not 'emp_joining_date')",
            },
            400,
        )

    # Map API field to whichever DB column exists.
    if "emp_joined_date" in normalized:
        joined_value = normalized.get("emp_joined_date")

        if "emp_joined_date" in columns_meta:
            normalized["emp_joined_date"] = joined_value
        elif "emp_joining_date" in columns_meta:
            normalized["emp_joining_date"] = joined_value
        else:
            return None, (
                {
                    "success": False,
                    "message": "employees table does not have a joined date column",
                },
                500,
            )

    # Validate shift id if provided
    if "emp_shift_id" in normalized and normalized.get("emp_shift_id") not in ("", None):
        try:
            normalized["emp_shift_id"] = int(normalized["emp_shift_id"])
        except Exception:
            return None, ({"success": False, "message": "emp_shift_id must be an integer"}, 400)

    # Normalize grade if provided
    if "emp_grade" in normalized and normalized.get("emp_grade") is not None:
        normalized["emp_grade"] = str(normalized.get("emp_grade")).strip()

    return normalized, None


def create_employee(payload: dict):
    """
    Create employee row and ensure user row exists.
    """
    emp_code = (payload.get("emp_code") or "").strip()
    emp_full_name = (payload.get("emp_full_name") or "").strip()
    emp_email = (payload.get("emp_email") or "").strip()

    if not emp_code or not emp_full_name or not emp_email:
        return (
            {
                "success": False,
                "message": "emp_code, emp_full_name, and emp_email are required",
            },
            400,
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        columns_meta = _get_employee_columns(cursor)
        if not columns_meta:
            return ({"success": False, "message": "employees table not found"}, 500)

        cursor.execute("SELECT 1 FROM employees WHERE emp_code = %s", (emp_code,))
        if cursor.fetchone():
            return ({"success": False, "message": f"Employee '{emp_code}' already exists"}, 409)

        cursor.execute("SELECT 1 FROM employees WHERE emp_email = %s", (emp_email,))
        if cursor.fetchone():
            return ({"success": False, "message": f"Email '{emp_email}' already exists"}, 409)

        normalized_payload, error_response = _normalize_employee_payload(payload, columns_meta)
        if error_response:
            return error_response

        if "emp_name" in normalized_payload and "emp_full_name" not in normalized_payload:
            normalized_payload["emp_full_name"] = normalized_payload["emp_name"]

        insert_data = {}
        for key, value in normalized_payload.items():
            if key in columns_meta and value is not None:
                insert_data[key] = value

        insert_data["emp_code"] = emp_code
        insert_data["emp_full_name"] = emp_full_name
        insert_data["emp_email"] = emp_email

        required_missing = []
        for column_name, meta in columns_meta.items():
            if meta["is_nullable"] == "NO" and meta["column_default"] is None and column_name not in insert_data:
                required_missing.append(column_name)

        if required_missing:
            client_missing = []
            for field in required_missing:
                if field == "emp_joining_date":
                    client_missing.append("emp_joined_date")
                else:
                    client_missing.append(field)

            return (
                {
                    "success": False,
                    "message": "Missing required employee fields",
                    "missing_fields": client_missing,
                },
                400,
            )

        columns = list(insert_data.keys())
        values = [insert_data[c] for c in columns]
        placeholders = ", ".join(["%s"] * len(columns))
        query = f"""
            INSERT INTO employees ({", ".join(columns)})
            VALUES ({placeholders})
            RETURNING *
        """
        cursor.execute(query, values)
        created_employee = cursor.fetchone()

        requested_role = (payload.get("role") or "employee").strip().lower()
        valid_roles = set(UserRole.all())
        if requested_role not in valid_roles:
            return (
                {
                    "success": False,
                    "message": f"Invalid role '{requested_role}'. Allowed: {', '.join(sorted(valid_roles))}",
                },
                400,
            )

        cursor.execute(
            """
            INSERT INTO users (emp_code, role, is_active)
            VALUES (%s, %s, true)
            ON CONFLICT (emp_code)
            DO UPDATE SET
                role = EXCLUDED.role,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING emp_code, role, is_active, created_at, updated_at
            """,
            (emp_code, requested_role),
        )
        user_record = cursor.fetchone()

        conn.commit()

        return (
            {
                "success": True,
                "message": "Employee created successfully",
                "data": {
                    "employee": _serialize_row(created_employee),
                    "user": _serialize_row(user_record),
                },
            },
            201,
        )

    except Exception as e:
        conn.rollback()
        logger.error("Create employee error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def delete_employee(emp_code: str, requested_by_emp_code: str = None, allow_self_delete: bool = False):
    """
    Delete employee and related user.
    """
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return ({"success": False, "message": "emp_code is required"}, 400)

    if not allow_self_delete and requested_by_emp_code and target_emp_code == requested_by_emp_code:
        return ({"success": False, "message": "You cannot delete your own account"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT emp_code, emp_email, emp_full_name FROM employees WHERE emp_code = %s",
            (target_emp_code,),
        )
        employee = cursor.fetchone()
        if not employee:
            return ({"success": False, "message": "Employee not found"}, 404)

        cursor.execute(
            """
            SELECT id
            FROM attendance
            WHERE employee_email = %s
              AND logout_time IS NULL
            LIMIT 1
            """,
            (employee["emp_email"],),
        )
        if cursor.fetchone():
            return (
                {
                    "success": False,
                    "message": "Cannot delete employee with an active attendance session",
                },
                400,
            )

        cursor.execute("DELETE FROM users WHERE emp_code = %s", (target_emp_code,))
        cursor.execute(
            """
            DELETE FROM employees
            WHERE emp_code = %s
            RETURNING emp_code, emp_email, emp_full_name
            """,
            (target_emp_code,),
        )
        deleted = cursor.fetchone()
        conn.commit()

        return (
            {
                "success": True,
                "message": "Employee deleted successfully",
                "data": deleted,
            },
            200,
        )
    except Exception as e:
        conn.rollback()
        logger.error("Delete employee error: %s", e)
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        return_connection(conn)


def get_employee(emp_code: str):
    """
    Get employee details by emp_code
    """
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return {"success": False, "message": "emp_code is required"}, 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM employees WHERE emp_code = %s", (target_emp_code,))
        employee = cursor.fetchone()
        
        if not employee:
            return {"success": False, "message": "Employee not found"}, 404
        
        # Get user role information if exists
        cursor.execute("SELECT role, is_active FROM users WHERE emp_code = %s", (target_emp_code,))
        user_record = cursor.fetchone()
        
        return {
            "success": True,
            "data": {
                "employee": _serialize_row(employee),
                "user": _serialize_row(user_record) if user_record else None
            }
        }, 200
    
    except Exception as e:
        logger.error("Get employee error: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        cursor.close()
        return_connection(conn)


def update_employee(emp_code: str, payload: dict, updated_by_emp_code: str = None):
    """
    Update employee details
    
    Parameters:
        emp_code: Employee code to update
        payload: Fields to update
        updated_by_emp_code: Who is performing the update (for audit)
    """
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return {"success": False, "message": "emp_code is required"}, 400
    
    if not payload:
        return {"success": False, "message": "No fields to update"}, 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.autocommit = False  # Start transaction
        
        # Check if employee exists
        cursor.execute("SELECT * FROM employees WHERE emp_code = %s", (target_emp_code,))
        employee = cursor.fetchone()
        
        if not employee:
            conn.rollback()
            return {"success": False, "message": "Employee not found"}, 404
        
        # Get table columns metadata
        columns_meta = _get_employee_columns(cursor)
        
        # Prepare update fields
        update_fields = []
        update_values = []
        
        # Fields that should never be updated
        protected_fields = {"emp_code"}
        
        # Check for email uniqueness if updating email
        if "emp_email" in payload:
            new_email = (payload.get("emp_email") or "").strip()
            if new_email and new_email != employee.get("emp_email"):
                cursor.execute(
                    "SELECT 1 FROM employees WHERE emp_email = %s AND emp_code != %s",
                    (new_email, target_emp_code)
                )
                if cursor.fetchone():
                    conn.rollback()
                    return {"success": False, "message": f"Email '{new_email}' is already in use"}, 409
        
        for key, value in payload.items():
            if key in protected_fields:
                conn.rollback()
                return {"success": False, "message": f"Cannot update protected field: {key}"}, 400
            
            if key not in columns_meta:
                continue  # Skip unknown fields
            
            if value is None:
                continue  # Skip None values
            
            # Normalize emp_joined_date
            if key == "emp_joined_date" and "emp_joined_date" not in columns_meta:
                if "emp_joining_date" in columns_meta:
                    key = "emp_joining_date"
            
            update_fields.append(f"{key} = %s")
            update_values.append(value)
        
        if not update_fields:
            conn.rollback()
            return {"success": False, "message": "No valid fields to update"}, 400
        
        # Execute update
        update_values.append(target_emp_code)
        query = f"""
            UPDATE employees
            SET {', '.join(update_fields)}
            WHERE emp_code = %s
            RETURNING *
        """
        
        cursor.execute(query, update_values)
        updated_employee = cursor.fetchone()
        
        conn.commit()
        
        return {
            "success": True,
            "message": "Employee updated successfully",
            "data": _serialize_row(updated_employee)
        }, 200
    
    except Exception as e:
        conn.rollback()
        logger.error("Update employee error: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cursor.close()
        return_connection(conn)
