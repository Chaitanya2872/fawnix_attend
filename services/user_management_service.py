"""
User Management Service
Handles employee create and delete operations.
"""

import logging
import re
from datetime import datetime

# pyrefly: ignore [missing-import]
import psycopg2
# pyrefly: ignore [missing-import]
from psycopg2 import sql

from config import UserRole
from database.connection import get_db_connection, return_connection
from services.attendance_constants import ATTENDANCE_STATUS_LOGGED_IN

logger = logging.getLogger(__name__)

ALLOWED_MANAGEMENT_ROLES = {"user_manager"}
ALLOWED_MANAGEMENT_DESIGNATIONS = {"devtester"}


def can_manage_users(current_user: dict) -> bool:
    """Check if current user can create/delete employees."""
    designation = (current_user.get("emp_designation") or "").strip().lower()
    if designation in ALLOWED_MANAGEMENT_DESIGNATIONS:
        return True

    role = (current_user.get("role") or "").strip().lower()
    if role in ALLOWED_MANAGEMENT_ROLES:
        return True

    if role == "admin":
        return bool(current_user.get("can_write"))

    return False


def _serialize_row(row: dict) -> dict:
    """Convert datetime values to string for API responses."""
    if not row:
        return row
    for key, value in row.items():
        if isinstance(value, datetime):
            row[key] = value.strftime("%Y-%m-%d %H:%M:%S")
    return row


EMPLOYEE_CODE_PATTERN = re.compile(r'^[A-Za-z0-9._-]{1,50}$')

# Some tables reference employees(emp_code) through a real foreign key (all of
# them NO ACTION, none deferrable); others just hold the code in a plain VARCHAR.
# The foreign keys are discovered from the catalog; these column names cover the
# unconstrained ones, which no catalog can point us at.
EMPLOYEE_CODE_REFERENCE_COLUMNS = (
    'emp_code',
    'manager_code',
    'emp_manager',
    'emp_informing_manager',
    'approver_emp_code',
    'assigned_to_emp_code',
    'created_by_emp_code',
    'updated_by_emp_code',
    'reviewed_by',
)

# Append-only history keeps whatever code was current when the row was written.
EMPLOYEE_CODE_RENAME_EXCLUDED_TABLES = {
    'api_logs',
    'database_audit_logs',
    'schema_migrations',
}


def _find_employee_code_foreign_key_columns(cursor):
    """Columns with a real foreign key onto employees(emp_code)."""
    cursor.execute(
        """
        SELECT child.relname AS table_name, child_att.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN pg_namespace ns ON ns.oid = child.relnamespace
        JOIN LATERAL unnest(con.conkey, con.confkey) AS keys(child_attnum, parent_attnum) ON TRUE
        JOIN pg_attribute child_att
            ON child_att.attrelid = con.conrelid AND child_att.attnum = keys.child_attnum
        JOIN pg_attribute parent_att
            ON parent_att.attrelid = con.confrelid AND parent_att.attnum = keys.parent_attnum
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
          AND parent.relname = 'employees'
          AND parent_att.attname = 'emp_code'
        """
    )
    return {(row['table_name'], row['column_name']) for row in cursor.fetchall()}


def _find_employee_code_named_columns(cursor):
    """Plain text columns that hold an employee code without a foreign key."""
    cursor.execute(
        """
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_name = ANY(%s)
        """,
        (list(EMPLOYEE_CODE_REFERENCE_COLUMNS),),
    )

    return {
        (row['table_name'], row['column_name'])
        for row in cursor.fetchall()
        if row['table_name'] not in EMPLOYEE_CODE_RENAME_EXCLUDED_TABLES
    }


def _find_employee_code_reference_columns(cursor):
    """
    Every column that has to move when a code is renamed: declared foreign keys
    plus the code-shaped columns that carry no constraint. employees.emp_code
    itself is excluded - the primary key moves via the clone/delete dance in
    _rename_employee_code.
    """
    references = _find_employee_code_foreign_key_columns(cursor) | _find_employee_code_named_columns(cursor)
    references.discard(('employees', 'emp_code'))
    return sorted(references)


def _rename_employee_code(cursor, old_code: str, new_code: str):
    """
    Move an employee onto a new code, references and all.

    Every foreign key onto employees(emp_code) is NO ACTION and non-deferrable,
    so neither update order is legal on its own: repointing children first fails
    because the new key does not exist yet, and moving the primary key first
    orphans the children. So the row is cloned under the new code, references
    are repointed while both keys exist, and the old row is dropped last.

    Must run inside the caller's transaction - a partial rename would leave the
    employee duplicated.
    """
    cursor.execute("SELECT * FROM employees WHERE emp_code = %s", (old_code,))
    employee_row = cursor.fetchone()
    if not employee_row:
        raise ValueError(f"Employee {old_code} disappeared mid-rename")

    columns = list(employee_row.keys())
    values = [new_code if column == 'emp_code' else employee_row[column] for column in columns]

    cursor.execute(
        sql.SQL("INSERT INTO employees ({columns}) VALUES ({placeholders})").format(
            columns=sql.SQL(', ').join(sql.Identifier(column) for column in columns),
            placeholders=sql.SQL(', ').join(sql.Placeholder() for _ in columns),
        ),
        values,
    )

    renamed_counts = {}
    for table_name, column_name in _find_employee_code_reference_columns(cursor):
        cursor.execute(
            sql.SQL("UPDATE {table} SET {column} = %s WHERE {column} = %s").format(
                table=sql.Identifier(table_name),
                column=sql.Identifier(column_name),
            ),
            (new_code, old_code),
        )
        if cursor.rowcount:
            renamed_counts[f"{table_name}.{column_name}"] = cursor.rowcount

    # Fails loudly if some reference was missed, rather than orphaning it.
    cursor.execute("DELETE FROM employees WHERE emp_code = %s", (old_code,))
    renamed_counts['employees.emp_code'] = 1

    return renamed_counts


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
              AND status = %s
            LIMIT 1
            """,
            (employee["emp_email"], ATTENDANCE_STATUS_LOGGED_IN),
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
        # conn.autocommit = False  # Start transaction
        
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

        # Renaming the employee code cascades to every table that references it.
        requested_code = payload.get("emp_code")
        new_emp_code = str(requested_code).strip() if requested_code is not None else ""
        rename_requested = bool(new_emp_code) and new_emp_code != target_emp_code
        renamed_counts = {}

        if rename_requested:
            if not EMPLOYEE_CODE_PATTERN.match(new_emp_code):
                conn.rollback()
                return {
                    "success": False,
                    "message": "Employee ID may only contain letters, numbers, dots, dashes or underscores (max 50)."
                }, 400

            cursor.execute(
                "SELECT 1 FROM employees WHERE emp_code = %s",
                (new_emp_code,)
            )
            if cursor.fetchone():
                conn.rollback()
                return {"success": False, "message": f"Employee ID '{new_emp_code}' is already in use"}, 409

            cursor.execute(
                "SELECT 1 FROM users WHERE emp_code = %s",
                (new_emp_code,)
            )
            if cursor.fetchone():
                conn.rollback()
                return {"success": False, "message": f"Employee ID '{new_emp_code}' is already in use"}, 409

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
            if key == "emp_code":
                continue  # Handled by the rename path above.

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
        
        if not update_fields and not rename_requested:
            conn.rollback()
            return {"success": False, "message": "No valid fields to update"}, 400

        if rename_requested:
            try:
                renamed_counts = _rename_employee_code(cursor, target_emp_code, new_emp_code)
            except psycopg2.Error as db_error:
                conn.rollback()
                logger.error("Employee code rename failed: %s", db_error)
                detail = str(db_error).strip().splitlines()[0]
                return {
                    "success": False,
                    "message": f"Could not change the Employee ID: {detail}"
                }, 409
            target_emp_code = new_emp_code

        if update_fields:
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
        else:
            cursor.execute("SELECT * FROM employees WHERE emp_code = %s", (target_emp_code,))
            updated_employee = cursor.fetchone()

        conn.commit()

        response = {
            "success": True,
            "message": "Employee updated successfully",
            "data": _serialize_row(updated_employee)
        }

        if rename_requested:
            response["message"] = f"Employee updated successfully. Employee ID changed to {new_emp_code}."
            response["emp_code_renamed"] = {
                "from": emp_code.strip(),
                "to": new_emp_code,
                "updated_references": renamed_counts,
            }

        return response, 200
    
    except Exception as e:
        conn.rollback()
        logger.error("Update employee error: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        # conn.autocommit = True
        cursor.close()
        return_connection(conn)
