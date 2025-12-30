from functools import wraps
from flask import jsonify
from database.connection import get_db_connection


def hr_or_devtester_required(f):
    @wraps(f)
    def decorated_function(current_user, *args, **kwargs):
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT emp_designation
                FROM employees
                WHERE emp_code = %s
            """, (current_user['emp_code'],))

            employee = cursor.fetchone()

            if not employee:
                return jsonify({
                    "success": False,
                    "message": "Employee not found"
                }), 404

            if employee['emp_designation'] not in ['HR', 'DevTester']:
                return jsonify({
                    "success": False,
                    "message": "Access denied"
                }), 403

            return f(current_user, *args, **kwargs)

        finally:
            cursor.close()
            conn.close()

    return decorated_function
