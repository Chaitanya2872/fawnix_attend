"""
Admin Service
Business logic for admin-only operations
"""

from database.connection import get_db_connection
from datetime import date, datetime



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
                a.emp_id,
                e.emp_full_name,
                a.date,
                a.check_in,
                a.check_out,
                a.total_hours,
                a.status
            FROM attendance a
            JOIN employees e ON a.employee_email = e.emp_email
            ORDER BY a.date DESC, e.emp_full_name
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()

def get_all_attendance_status():
    """Get current attendance status for all employees"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT a.*
            FROM attendance a
            INNER JOIN (
                SELECT employee_email, MAX(login_time) AS latest_login
                FROM attendance
                GROUP BY employee_email
            ) latest
            ON a.employee_email = latest.employee_email
            AND a.login_time = latest.latest_login
            ORDER BY a.login_time DESC
        """)

        records = cursor.fetchall()
        result = []

        for record in records:
            is_logged_in = record['logout_time'] is None
            attendance_id = record['id']

            active_activities = []
            active_field_visits = []

            if is_logged_in:
                cursor.execute("""
                    SELECT id, activity_type, start_time
                    FROM activities
                    WHERE attendance_id = %s AND status = 'active'
                """, (attendance_id,))
                active_activities = cursor.fetchall()

                cursor.execute("""
                    SELECT id, visit_type, start_time
                    FROM field_visits
                    WHERE attendance_id = %s AND status = 'active'
                """, (attendance_id,))
                active_field_visits = cursor.fetchall()

            # Convert datetime
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')

            result.append({
                "employee_email": record['employee_email'],
                "attendance_id": attendance_id,
                "status": record['status'],
                "is_logged_in": is_logged_in,
                "login_time": record['login_time'],
                "logout_time": record['logout_time'],
                "working_hours": float(record['working_hours'] or 0),
                "active_sessions": {
                    "activities": active_activities,
                    "field_visits": active_field_visits,
                    "total_active": len(active_activities) + len(active_field_visits)
                }
            })

        return ({
            "success": True,
            "data": result
        }, 200)

    finally:
        cursor.close()
        conn.close()

def get_all_attendance_history(limit: int = 100):
    """Get attendance history for all employees"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM attendance
            ORDER BY login_time DESC
            LIMIT %s
        """, (limit,))

        records = cursor.fetchall()

        for record in records:
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')

        total_hours = sum(float(r['working_hours'] or 0) for r in records)
        completed_days = len([r for r in records if r['status'] == 'logged_out'])

        return ({
            "success": True,
            "data": {
                "records": records,
                "statistics": {
                    "total_records": len(records),
                    "completed_days": completed_days,
                    "total_hours": round(total_hours, 2),
                    "average_hours": round(
                        total_hours / completed_days, 2
                    ) if completed_days else 0
                }
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()

def get_all_day_summary(target_date: date = None):
    """Get complete day summary for all employees"""
    if not target_date:
        target_date = date.today()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT *
            FROM attendance
            WHERE date = %s
        """, (target_date,))

        attendances = cursor.fetchall()
        summaries = []

        for attendance in attendances:
            attendance_id = attendance['id']

            cursor.execute("""
                SELECT *
                FROM activities
                WHERE attendance_id = %s
            """, (attendance_id,))
            activities = cursor.fetchall()

            cursor.execute("""
                SELECT *
                FROM field_visits
                WHERE attendance_id = %s
            """, (attendance_id,))
            field_visits = cursor.fetchall()

            # Convert datetime
            for key, value in attendance.items():
                if isinstance(value, datetime):
                    attendance[key] = value.strftime('%Y-%m-%d %H:%M:%S')

            for activity in activities:
                for k, v in activity.items():
                    if isinstance(v, datetime):
                        activity[k] = v.strftime('%Y-%m-%d %H:%M:%S')

            for visit in field_visits:
                for k, v in visit.items():
                    if isinstance(v, datetime):
                        visit[k] = v.strftime('%Y-%m-%d %H:%M:%S')

            total_distance = sum(float(fv.get('total_distance_km') or 0) for fv in field_visits)

            summaries.append({
                "employee_email": attendance['employee_email'],
                "attendance": attendance,
                "activities": activities,
                "field_visits": field_visits,
                "summary": {
                    "total_activities": len(activities),
                    "total_field_visits": len(field_visits),
                    "total_distance_km": round(total_distance, 2),
                    "working_hours": float(attendance.get('working_hours') or 0)
                }
            })

        return ({
            "success": True,
            "data": {
                "date": str(target_date),
                "employees": summaries
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()
