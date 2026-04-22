"""
Admin Service
Business logic for admin-only operations
"""

from database.connection import get_db_connection
from datetime import date, datetime, time
from config import Config
import calendar
from services.attendance_constants import ATTENDANCE_STATUS_LOGGED_IN
from services.CompLeaveService import (
    attach_attendance_context_to_overtime_records,
    serialize_temporal_values,
)



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
                e.emp_grade,
                e.emp_designation,
                e.emp_department,
                e.emp_branch_id,
                e.emp_manager,
                e.emp_informing_manager,
                m.emp_full_name AS manager_name,
                m.emp_email AS manager_email,
                m.emp_code AS manager_code,
                u.role,
                u.is_active,
                u.last_login
            FROM employees e
            LEFT JOIN employees m ON e.emp_manager = m.emp_code
            LEFT JOIN users u ON e.emp_code = u.emp_code
            ORDER BY e.emp_full_name
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


def create_admin_user(emp_code: str, can_read: bool = True, can_write: bool = False):
    """Promote an employee to admin and create/update admin permissions."""
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return ({"success": False, "message": "emp_code is required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT emp_code, emp_full_name, emp_email, emp_designation
            FROM employees
            WHERE emp_code = %s
            """,
            (target_emp_code,),
        )
        employee = cursor.fetchone()
        if not employee:
            return ({"success": False, "message": "Employee not found"}, 404)

        cursor.execute(
            """
            INSERT INTO users (emp_code, role, is_active)
            VALUES (%s, 'admin', true)
            ON CONFLICT (emp_code)
            DO UPDATE SET
                role = 'admin',
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING emp_code, role, is_active, created_at, updated_at
            """,
            (target_emp_code,),
        )
        user_record = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO admin_permissions (emp_code, can_read, can_write)
            VALUES (%s, %s, %s)
            ON CONFLICT (emp_code)
            DO UPDATE SET
                can_read = EXCLUDED.can_read,
                can_write = EXCLUDED.can_write,
                updated_at = CURRENT_TIMESTAMP
            RETURNING emp_code, can_read, can_write, created_at, updated_at
            """,
            (target_emp_code, bool(can_read), bool(can_write)),
        )
        permissions = cursor.fetchone()

        conn.commit()

        return ({
            "success": True,
            "message": "Admin added successfully",
            "data": {
                "employee": employee,
                "user": user_record,
                "permissions": permissions,
            }
        }, 201)
    except Exception as e:
        conn.rollback()
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_admin_permissions(emp_code: str):
    """Get admin read/write permissions."""
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return ({"success": False, "message": "emp_code is required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_designation,
                COALESCE(u.role, 'employee') AS role,
                COALESCE(ap.can_read, false) AS can_read,
                COALESCE(ap.can_write, false) AS can_write,
                ap.created_at,
                ap.updated_at
            FROM employees e
            LEFT JOIN users u ON u.emp_code = e.emp_code
            LEFT JOIN admin_permissions ap ON ap.emp_code = e.emp_code
            WHERE e.emp_code = %s
            """,
            (target_emp_code,),
        )
        row = cursor.fetchone()
        if not row:
            return ({"success": False, "message": "Employee not found"}, 404)

        return ({
            "success": True,
            "data": row,
        }, 200)
    finally:
        cursor.close()
        conn.close()


def update_admin_permissions(emp_code: str, can_read=None, can_write=None):
    """Update admin permissions and ensure the user stays admin."""
    target_emp_code = (emp_code or "").strip()
    if not target_emp_code:
        return ({"success": False, "message": "emp_code is required"}, 400)
    if can_read is None and can_write is None:
        return ({"success": False, "message": "At least one of can_read or can_write is required"}, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT emp_code FROM employees WHERE emp_code = %s", (target_emp_code,))
        if not cursor.fetchone():
            return ({"success": False, "message": "Employee not found"}, 404)

        cursor.execute(
            """
            INSERT INTO users (emp_code, role, is_active)
            VALUES (%s, 'admin', true)
            ON CONFLICT (emp_code)
            DO UPDATE SET
                role = 'admin',
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            """,
            (target_emp_code,),
        )

        cursor.execute(
            """
            INSERT INTO admin_permissions (emp_code, can_read, can_write)
            VALUES (%s, COALESCE(%s, true), COALESCE(%s, false))
            ON CONFLICT (emp_code)
            DO UPDATE SET
                can_read = COALESCE(%s, admin_permissions.can_read),
                can_write = COALESCE(%s, admin_permissions.can_write),
                updated_at = CURRENT_TIMESTAMP
            RETURNING emp_code, can_read, can_write, created_at, updated_at
            """,
            (target_emp_code, can_read, can_write, can_read, can_write),
        )
        permissions = cursor.fetchone()
        conn.commit()

        return ({
            "success": True,
            "message": "Admin permissions updated successfully",
            "data": permissions,
        }, 200)
    except Exception as e:
        conn.rollback()
        return ({"success": False, "message": str(e)}, 500)
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

def get_attendance_report_data(month: int, year: int):
    """Fetch Todays Activity filtered by month and year for report export."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                a.*,
                e.emp_full_name,
                e.emp_email,
                e.emp_designation,
                e.emp_department
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
            WHERE EXTRACT(MONTH FROM a.date) = %s
              AND EXTRACT(YEAR FROM a.date) = %s
            ORDER BY a.date ASC, a.login_time ASC
        """, (month, year))

        records = cursor.fetchall()

        for record in records:
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, date):
                    record[key] = value.strftime('%Y-%m-%d')

        return records

    finally:
        cursor.close()
        conn.close()

def get_attendance_report_summary(month: int, year: int):
    """Return attendance summary per employee for a month/year."""
    conn = get_db_connection()
    cursor = conn.cursor()

    start_date = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    end_date = date(year, month, last_day)

    try:
        cursor.execute("""
            SELECT
                e.emp_code,
                e.emp_full_name,
                COUNT(DISTINCT a.date) AS attended_days,
                SUM(
                    CASE
                        WHEN a.login_time IS NOT NULL
                             AND CAST(a.login_time AS time) > %s THEN 1
                        ELSE 0
                    END
                ) AS late_arrivals
            FROM employees e
            LEFT JOIN attendance a
                ON a.employee_email = e.emp_email
               AND a.date BETWEEN %s AND %s
            GROUP BY e.emp_code, e.emp_full_name
            ORDER BY e.emp_full_name
        """, (time(10, 15), start_date, end_date))
        attendance_rows = cursor.fetchall()

        cursor.execute("""
            SELECT
                emp_code,
                COALESCE(SUM(comp_off_earned), 0) AS comp_offs
            FROM comp_offs
            WHERE work_date BETWEEN %s AND %s
            GROUP BY emp_code
        """, (start_date, end_date))
        comp_off_map = {row['emp_code']: float(row['comp_offs'] or 0) for row in cursor.fetchall()}

        cursor.execute("""
            SELECT
                emp_code,
                COALESCE(SUM(leave_count), 0) AS leaves
            FROM leaves
            WHERE status = 'approved'
              AND from_date <= %s
              AND to_date >= %s
            GROUP BY emp_code
        """, (end_date, start_date))
        leave_map = {row['emp_code']: float(row['leaves'] or 0) for row in cursor.fetchall()}

        summary = []
        for row in attendance_rows:
            emp_code = row.get('emp_code')
            comp_offs = comp_off_map.get(emp_code, 0)
            leaves = leave_map.get(emp_code, 0)
            attended_days = int(row.get('attended_days') or 0)
            late_arrivals = int(row.get('late_arrivals') or 0)

            if attended_days == 0 and comp_offs == 0 and leaves == 0:
                continue

            summary.append({
                "emp_code": emp_code,
                "emp_full_name": row.get('emp_full_name') or '',
                "attended_days": attended_days,
                "late_arrivals": late_arrivals,
                "comp_offs": comp_offs,
                "leaves": leaves
            })

        return summary

    finally:
        cursor.close()
        conn.close()

def get_all_attendance_status():
    """Get current attendance status for all employees"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                a.*,
                e.emp_designation
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
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
            is_logged_in = (
                record['logout_time'] is None and
                record.get('status') == ATTENDANCE_STATUS_LOGGED_IN
            )
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
                "emp_designation": record.get('emp_designation'),
                "attendance_id": attendance_id,
                "attendance_type": record.get('attendance_type', 'office'),
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

def get_all_attendance_history(limit: int = None, target_date: date = None,
                               page: int = None, page_size: int = None):
    """Get attendance history for all employees (optional date filter + pagination)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        base_query = """
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
        """
        params = []

        if target_date:
            base_query += " WHERE a.date = %s"
            params.append(target_date)

        cursor.execute(f"SELECT COUNT(*) AS total_records {base_query}", params)
        total_records = cursor.fetchone()['total_records']

        late_cutoff = datetime.strptime(Config.LATE_LOGIN_CUTOFF, "%H:%M").time()
        cursor.execute(
            f"""
                SELECT
                    SUM(
                        CASE
                            WHEN login_time IS NOT NULL
                                 AND CAST(login_time AS time) > %s THEN 1
                            ELSE 0
                        END
                    ) AS late_logins,
                    SUM(
                        CASE
                            WHEN login_time IS NOT NULL
                                 AND CAST(login_time AS time) <= %s THEN 1
                            ELSE 0
                        END
                    ) AS on_time_logins,
                    SUM(
                        CASE
                            WHEN status = 'logged_out' THEN 1
                            ELSE 0
                        END
                    ) AS logged_out_count,
                    SUM(
                        CASE
                            WHEN LOWER(COALESCE(status, '')) LIKE '%%late%%'
                                 OR LOWER(COALESCE(status, '')) LIKE '%%pending%%' THEN 1
                            ELSE 0
                        END
                    ) AS late_exception_count
                {base_query}
            """,
            [late_cutoff, late_cutoff] + params
        )
        shift_metrics = cursor.fetchone() or {}

        comp_off_days = 0
        if target_date:
            cursor.execute("""
                SELECT COALESCE(SUM(comp_off_earned), 0) AS comp_off_days
                FROM comp_offs
                WHERE work_date = %s
            """, (target_date,))
            comp_off_days = float(cursor.fetchone().get('comp_off_days') or 0)

        logged_out_count = int(shift_metrics.get('logged_out_count') or 0)
        efficiency_score = round((logged_out_count / total_records) * 100, 2) if total_records else 0

        query = f"""
            SELECT
                a.*,
                e.emp_designation
            {base_query}
            ORDER BY login_time DESC
        """

        pagination_params = []
        if page_size:
            offset = max((page or 1) - 1, 0) * page_size
            query += " LIMIT %s OFFSET %s"
            pagination_params.extend([page_size, offset])
        elif limit is not None:
            query += " LIMIT %s"
            pagination_params.append(limit)

        cursor.execute(query, params + pagination_params)

        records = cursor.fetchall()

        for record in records:
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            record['working_hours'] = float(record.get('working_hours') or 0)

        total_hours = sum(float(r['working_hours'] or 0) for r in records)
        completed_days = len([r for r in records if r['status'] == 'logged_out'])

        return ({
            "success": True,
            "data": {
                "records": records,
                "total_records": total_records,
                "shift_compliance": {
                    "late_logins": int(shift_metrics.get('late_logins') or 0),
                    "on_time_logins": int(shift_metrics.get('on_time_logins') or 0),
                    "logged_out": int(shift_metrics.get('logged_out_count') or 0),
                    "late_exceptions": int(shift_metrics.get('late_exception_count') or 0),
                },
                "attendance_summary": {
                    "attendance_count": total_records,
                    "comp_off_days": comp_off_days,
                    "efficiency_score": efficiency_score
                },
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
            SELECT
                a.*,
                e.emp_designation
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
            WHERE a.date = %s
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
                "emp_designation": attendance.get('emp_designation'),
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


def get_all_activities(limit: int = 100, activity_type: str = None,
                       include_tracking: bool = True, include_activity_tracking: bool = True):
    """Get activities for all employees (optionally include field visit + activity GPS tracking points)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT 
                a.*,
                fv.id as field_visit_id,
                fv.visit_type as field_visit_type,
                fv.purpose as field_visit_purpose,
                fv.start_time as field_visit_start_time,
                fv.end_time as field_visit_end_time,
                fv.start_latitude,
                fv.start_longitude,
                fv.end_latitude,
                fv.end_longitude,
                fv.start_address as field_visit_start_address,
                fv.end_address as field_visit_end_address,
                fv.total_distance_km,
                fv.duration_minutes as field_visit_duration_minutes,
                fv.status as field_visit_status
            FROM activities a
            LEFT JOIN field_visits fv ON a.field_visit_id = fv.id
        """
        params = []

        if activity_type:
            query += " WHERE a.activity_type = %s"
            params.append(activity_type)

        query += " ORDER BY a.start_time DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        activities = cursor.fetchall()

        # Convert datetime and parse coordinates
        for activity in activities:
            for key, value in activity.items():
                if isinstance(value, datetime):
                    activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')

            # Parse start coordinates
            start_coords = activity.get('start_location', '').split(', ')
            activity['start_lat'] = start_coords[0] if len(start_coords) > 0 else ''
            activity['start_lon'] = start_coords[1] if len(start_coords) > 1 else ''

            # Parse end coordinates
            end_location = activity.get('end_location', '')
            if end_location:
                end_coords = end_location.split(', ')
                activity['end_lat'] = end_coords[0] if len(end_coords) > 0 else ''
                activity['end_lon'] = end_coords[1] if len(end_coords) > 1 else ''

            # Parse destinations JSON
            if activity.get('destinations'):
                try:
                    import json
                    activity['destinations'] = json.loads(activity['destinations'])
                except Exception:
                    pass

            activity['purpose'] = (
                activity.get('field_visit_purpose')
                or activity.get('notes')
                or activity.get('activity_type')
            )
            activity['start_address'] = (
                activity.get('field_visit_start_address')
                or activity.get('start_address')
                or ''
            )
            activity['end_address'] = (
                activity.get('field_visit_end_address')
                or activity.get('end_address')
                or ''
            )

        # Include all field visit tracking points if requested
        if include_tracking:
            field_visit_ids = [a['field_visit_id'] for a in activities if a.get('field_visit_id')]
            if field_visit_ids:
                cursor.execute("""
                    SELECT *
                    FROM field_visit_tracking
                    WHERE field_visit_id = ANY(%s)
                    ORDER BY tracked_at ASC
                """, (field_visit_ids,))

                points = cursor.fetchall()

                tracking_by_visit = {}
                for point in points:
                    for key, value in point.items():
                        if isinstance(value, datetime):
                            point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    tracking_by_visit.setdefault(point['field_visit_id'], []).append(point)

                for activity in activities:
                    fvid = activity.get('field_visit_id')
                    if fvid:
                        activity['field_visit_tracking'] = tracking_by_visit.get(fvid, [])
                        activity['field_visit_tracking_count'] = len(activity['field_visit_tracking'])

        # Include activity GPS tracking points (location_tracking) if requested
        if include_activity_tracking:
            activity_ids = [a['id'] for a in activities if a.get('id')]
            if activity_ids:
                cursor.execute("""
                    SELECT *
                    FROM location_tracking
                    WHERE activity_id = ANY(%s)
                    ORDER BY tracked_at ASC
                """, (activity_ids,))

                points = cursor.fetchall()

                tracking_by_activity = {}
                for point in points:
                    for key, value in point.items():
                        if isinstance(value, datetime):
                            point[key] = value.strftime('%Y-%m-%d %H:%M:%S')

                    # Derive latitude/longitude from location string if missing
                    coords = (point.get('location') or '').split(', ')
                    if coords and len(coords) >= 2:
                        point.setdefault('latitude', coords[0])
                        point.setdefault('longitude', coords[1])

                    tracking_by_activity.setdefault(point['activity_id'], []).append(point)

                for activity in activities:
                    aid = activity.get('id')
                    if aid:
                        activity['activity_tracking'] = tracking_by_activity.get(aid, [])
                        activity['activity_tracking_count'] = len(activity['activity_tracking'])

        return ({
            "success": True,
            "data": {
                "activities": activities,
                "count": len(activities),
                "include_tracking": include_tracking,
                "include_activity_tracking": include_activity_tracking
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()


def get_all_leaves(limit: int = 100, status: str = None, emp_code: str = None,
                   from_date: date = None, to_date: date = None):
    """Get leave requests for all employees"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT 
                l.*,
                e.emp_full_name,
                e.emp_email,
                e.emp_designation,
                e.emp_manager
            FROM leaves l
            LEFT JOIN employees e ON l.emp_code = e.emp_code
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND l.status = %s"
            params.append(status)

        if emp_code:
            query += " AND l.emp_code = %s"
            params.append(emp_code)

        if from_date:
            query += " AND l.from_date >= %s"
            params.append(from_date)

        if to_date:
            query += " AND l.to_date <= %s"
            params.append(to_date)

        query += " ORDER BY l.applied_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        leaves = cursor.fetchall()

        # Convert datetime/date to strings
        for leave in leaves:
            for key, value in leave.items():
                if isinstance(value, datetime):
                    leave[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(value, date):
                    leave[key] = value.strftime('%Y-%m-%d')

        return ({
            "success": True,
            "data": {
                "leaves": leaves,
                "count": len(leaves)
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()


def get_all_overtime_records(limit: int = 100, status: str = None,
                             emp_code: str = None,
                             from_date: date = None,
                             to_date: date = None):
    """Get overtime records for all employees"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT 
                o.*,
                e.emp_full_name,
                e.emp_email,
                e.emp_designation
            FROM overtime_records o
            LEFT JOIN employees e ON o.emp_code = e.emp_code
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND o.status = %s"
            params.append(status)

        if emp_code:
            query += " AND o.emp_code = %s"
            params.append(emp_code)

        if from_date:
            query += " AND o.work_date >= %s"
            params.append(from_date)

        if to_date:
            query += " AND o.work_date <= %s"
            params.append(to_date)

        query += " ORDER BY o.work_date DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        records = cursor.fetchall()
        attach_attendance_context_to_overtime_records(cursor, records)
        records = [serialize_temporal_values(record) for record in records]

        return ({
            "success": True,
            "data": {
                "overtime_records": records,
                "count": len(records)
            }
        }, 200)

    finally:
        cursor.close()
        conn.close()
