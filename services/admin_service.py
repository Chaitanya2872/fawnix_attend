"""
Admin Service
Business logic for admin-only operations
"""

from database.connection import get_db_connection


def get_admin_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT COUNT(*) AS total_employees FROM employees")
        total_employees = cursor.fetchone()['total_employees']

        cursor.execute("SELECT COUNT(*) AS active_users FROM users WHERE is_active = true")
        active_users = cursor.fetchone()['active_users']

        return {
            "total_employees": total_employees,
            "active_users": active_users
        }

    finally:
        cursor.close()
        conn.close()
        
def get_all_employees():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_contact,
                e.emp_designation,
                e.emp_branch_id,
                e.emp_manager,
                e.emp_informing_manager,
                u.role,
                u.is_active,
                u.last_login
            FROM employees e
            LEFT JOIN users u ON e.emp_code = u.emp_code
            ORDER BY e.emp_full_name
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()
        
def get_all_attendance_records():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                a.record_id,
                a.emp_code,
                e.emp_full_name,
                a.date,
                a.check_in,
                a.check_out,
                a.total_hours,
                a.status
            FROM attendance_records a
            JOIN employees e ON a.emp_code = e.emp_code
            ORDER BY a.date DESC, e.emp_full_name
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()
