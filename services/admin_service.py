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
