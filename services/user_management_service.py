"""
User Management Service
Handles employee create and delete operations.
"""

import logging
from datetime import datetime

from config import UserRole
from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)

ALLOWED_MANAGEMENT_ROLES = {"admin", "user_manager", "hr"}


def can_manage_users(current_user: dict) -> bool:
    """Check if current user can create/delete employees."""
    role = (current_user.get("role") or "").strip().lower()
    return role in ALLOWED_MANAGEMENT_ROLES


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

        normalized_payload = dict(payload)
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
            return (
                {
                    "success": False,
                    "message": "Missing required employee fields",
                    "missing_fields": required_missing,
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


def delete_employee(emp_code: str, requested_by_emp_code: str = None):
    """
    Delete employee and related user.
    """
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return ({"success": False, "message": "emp_code is required"}, 400)

    if requested_by_emp_code and target_emp_code == requested_by_emp_code:
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
