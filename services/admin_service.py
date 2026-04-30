"""
Admin Service
Business logic for admin-only operations
"""

from database.connection import get_db_connection
from datetime import date, datetime, time, timedelta
from config import Config
import calendar
from collections import OrderedDict
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


def _format_time_as_12h(timestamp_value):
    """Format datetime value as HH:MM AM/PM."""
    if not isinstance(timestamp_value, datetime):
        return "Incomplete"
    return timestamp_value.strftime("%I:%M %p")


def _format_minutes_as_hours_and_minutes(total_minutes):
    """Format integer minutes as <hours>h <minutes>m."""
    if total_minutes is None:
        return "Incomplete"

    rounded_minutes = max(int(round(total_minutes)), 0)
    hours = rounded_minutes // 60
    minutes = rounded_minutes % 60
    return f"{hours}h {minutes:02d}m"


def get_attendance_report_base_data(month: int = None, year: int = None, target_date: date = None):
    """
    Fetch attendance rows used to derive reporting outputs.

    Supported filters:
    - target_date (daily report)
    - month + year (monthly report)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if target_date is not None:
            cursor.execute(
                """
                SELECT
                    a.id,
                    a.date,
                    a.employee_email,
                    a.employee_name,
                    a.login_time,
                    a.logout_time,
                    e.emp_code,
                    e.emp_full_name
                FROM attendance a
                LEFT JOIN employees e
                    ON a.employee_email = e.emp_email
                WHERE a.date = %s
                ORDER BY a.login_time ASC, COALESCE(e.emp_full_name, a.employee_name) ASC
                """,
                (target_date,),
            )
        elif month is not None and year is not None:
            cursor.execute(
                """
                SELECT
                    a.id,
                    a.date,
                    a.employee_email,
                    a.employee_name,
                    a.login_time,
                    a.logout_time,
                    e.emp_code,
                    e.emp_full_name
                FROM attendance a
                LEFT JOIN employees e
                    ON a.employee_email = e.emp_email
                WHERE EXTRACT(MONTH FROM a.date) = %s
                  AND EXTRACT(YEAR FROM a.date) = %s
                ORDER BY a.date ASC, a.login_time ASC, COALESCE(e.emp_full_name, a.employee_name) ASC
                """,
                (month, year),
            )
        else:
            raise ValueError("Either target_date or month/year must be provided")

        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def build_daily_attendance_report_rows(records):
    """
    Build normalized daily attendance rows with duration/overtime metrics.
    These rows are the canonical source for CSV/XLSX/PDF exports.
    """
    daily_rows = []

    for record in records:
        emp_id = (record.get("emp_code") or record.get("employee_email") or "").strip()
        emp_name = (record.get("emp_full_name") or record.get("employee_name") or "").strip()
        clock_in = record.get("login_time")
        clock_out = record.get("logout_time")

        duration_minutes = None
        if isinstance(clock_in, datetime) and isinstance(clock_out, datetime):
            raw_minutes = int((clock_out - clock_in).total_seconds() / 60)
            if raw_minutes >= 0:
                duration_minutes = raw_minutes

        overtime_minutes = None
        if duration_minutes is not None:
            overtime_minutes = max(duration_minutes - (8 * 60), 0)

        daily_rows.append(
            {
                "date": record.get("date"),
                "employee_id": emp_id,
                "employee_name": emp_name,
                "clock_in": clock_in,
                "clock_out": clock_out,
                "clock_in_display": _format_time_as_12h(clock_in),
                "clock_out_display": _format_time_as_12h(clock_out),
                "duration_minutes": duration_minutes,
                "duration_display": _format_minutes_as_hours_and_minutes(duration_minutes),
                "overtime_minutes": overtime_minutes,
                "overtime_display": _format_minutes_as_hours_and_minutes(overtime_minutes),
            }
        )

    return daily_rows


def build_monthly_attendance_report_rows(daily_rows):
    """
    Summarize monthly attendance metrics from canonical daily rows.
    """
    summary_map = OrderedDict()

    for row in daily_rows:
        summary_key = (row.get("employee_id") or "", row.get("employee_name") or "")
        if summary_key not in summary_map:
            summary_map[summary_key] = {
                "employee_id": row.get("employee_id") or "",
                "employee_name": row.get("employee_name") or "",
                "total_working_days": 0,
                "total_hours_minutes": 0,
                "total_overtime_minutes": 0,
            }

        summary = summary_map[summary_key]
        duration_minutes = row.get("duration_minutes")
        overtime_minutes = row.get("overtime_minutes")

        if duration_minutes is None:
            continue

        summary["total_working_days"] += 1
        summary["total_hours_minutes"] += int(duration_minutes)
        summary["total_overtime_minutes"] += int(overtime_minutes or 0)

    monthly_rows = []
    for _key, summary in summary_map.items():
        working_days = summary["total_working_days"]
        total_minutes = summary["total_hours_minutes"]
        overtime_minutes = summary["total_overtime_minutes"]
        average_minutes = round(total_minutes / working_days) if working_days else 0

        monthly_rows.append(
            {
                "employee_id": summary["employee_id"],
                "employee_name": summary["employee_name"],
                "total_working_days": working_days,
                "total_hours_minutes": total_minutes,
                "total_hours_display": _format_minutes_as_hours_and_minutes(total_minutes),
                "average_minutes_per_day": average_minutes,
                "average_hours_display": _format_minutes_as_hours_and_minutes(average_minutes),
                "total_overtime_minutes": overtime_minutes,
                "total_overtime_display": _format_minutes_as_hours_and_minutes(overtime_minutes),
            }
        )

    monthly_rows.sort(key=lambda row: ((row.get("employee_name") or "").lower(), row.get("employee_id") or ""))
    return monthly_rows

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


def _is_second_saturday(target_date: date) -> bool:
    return target_date.weekday() == 5 and 8 <= target_date.day <= 14


def _is_sunday(target_date: date) -> bool:
    return target_date.weekday() == 6


def _normalize_holiday_type(raw_type, is_mandatory) -> str:
    normalized = str(raw_type or '').strip()
    if normalized:
        return normalized
    return 'Public Holiday' if bool(is_mandatory) else 'Optional Holiday'


def _normalize_holiday_status(raw_status) -> str:
    normalized = str(raw_status or '').strip()
    return normalized if normalized else 'Active'


def _get_organization_holiday_columns(cursor):
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'organization_holidays'
        """
    )
    rows = cursor.fetchall()
    columns = set()
    for row in rows:
        if hasattr(row, 'get'):
            column_name = row.get('column_name')
        elif isinstance(row, (tuple, list)) and row:
            column_name = row[0]
        else:
            column_name = None
        if column_name:
            columns.add(str(column_name))
    return columns


def _parse_holiday_row(row):
    if hasattr(row, 'get'):
        row_data = row
    elif isinstance(row, (list, tuple)):
        row_data = {
            "id": row[0] if len(row) > 0 else None,
            "holiday_date": row[1] if len(row) > 1 else None,
            "holiday_name": row[2] if len(row) > 2 else '',
            "is_mandatory": row[3] if len(row) > 3 else True,
            "holiday_type": row[4] if len(row) > 4 else None,
            "description": row[5] if len(row) > 5 else '',
            "status": row[6] if len(row) > 6 else 'Active',
        }
    else:
        return None

    holiday_date = row_data.get('holiday_date')
    if isinstance(holiday_date, datetime):
        holiday_date = holiday_date.date()
    if not isinstance(holiday_date, date):
        return None

    return {
        "id": row_data.get('id'),
        "date": holiday_date.isoformat(),
        "holiday_date": holiday_date,
        "holiday_name": (row_data.get('holiday_name') or '').strip(),
        "holiday_type": _normalize_holiday_type(row_data.get('holiday_type'), row_data.get('is_mandatory')),
        "description": (row_data.get('description') or '').strip(),
        "status": _normalize_holiday_status(row_data.get('status')),
        "is_mandatory": bool(row_data.get('is_mandatory')),
    }


def get_admin_holidays(year: int, month: int = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    if month is not None and (month < 1 or month > 12):
        return ({
            "success": False,
            "message": "Invalid month. Use 1-12."
        }, 400)

    if year < 2000 or year > 2100:
        return ({
            "success": False,
            "message": "Invalid year. Must be between 2000 and 2100."
        }, 400)

    try:
        available_columns = _get_organization_holiday_columns(cursor)
        holiday_select_fields = [
            "id",
            "holiday_date",
            "holiday_name",
            "is_mandatory" if 'is_mandatory' in available_columns else "TRUE AS is_mandatory",
            "holiday_type" if 'holiday_type' in available_columns else "NULL::TEXT AS holiday_type",
            "description" if 'description' in available_columns else "NULL::TEXT AS description",
            "status" if 'status' in available_columns else "'Active'::TEXT AS status",
        ]
        query = """
            SELECT
                {holiday_select_fields}
            FROM organization_holidays
            WHERE EXTRACT(YEAR FROM holiday_date) = %s
        """.format(holiday_select_fields=",\n                ".join(holiday_select_fields))
        params = [year]

        if month is not None:
            query += " AND EXTRACT(MONTH FROM holiday_date) = %s"
            params.append(month)

        query += " ORDER BY holiday_date ASC"
        cursor.execute(query, params)
        raw_rows = cursor.fetchall()

        configured_by_date = {}
        configured_rows = []

        for raw_row in raw_rows:
            parsed = _parse_holiday_row(raw_row)
            if not parsed:
                continue
            configured_rows.append(parsed)
            configured_by_date[parsed['date']] = parsed

        if month is None:
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
        else:
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])

        holiday_rows = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.isoformat()
            configured = configured_by_date.get(date_key)
            is_sunday = _is_sunday(current_date)
            is_second_saturday = _is_second_saturday(current_date)
            weekend_name = 'Sunday' if is_sunday else 'Second Saturday' if is_second_saturday else ''

            if configured:
                configured_status = _normalize_holiday_status(configured.get('status'))
                configured_active = configured_status.lower() == 'active'
                is_holiday = configured_active or bool(weekend_name)

                holiday_rows.append({
                    "id": configured.get('id'),
                    "date": date_key,
                    "holidayName": configured.get('holiday_name') or weekend_name,
                    "holidayType": configured.get('holiday_type') or ('Weekend' if weekend_name else 'Holiday'),
                    "description": configured.get('description') or '',
                    "status": configured_status,
                    "isConfigured": True,
                    "isHoliday": is_holiday,
                    "isSunday": is_sunday,
                    "isSecondSaturday": is_second_saturday,
                    "dayType": (
                        'Holiday'
                        if configured_active
                        else 'Sunday'
                        if is_sunday
                        else 'Second Saturday'
                        if is_second_saturday
                        else 'Working Day'
                    ),
                })
            elif weekend_name:
                holiday_rows.append({
                    "id": None,
                    "date": date_key,
                    "holidayName": weekend_name,
                    "holidayType": 'Weekend',
                    "description": '',
                    "status": 'Active',
                    "isConfigured": False,
                    "isHoliday": True,
                    "isSunday": is_sunday,
                    "isSecondSaturday": is_second_saturday,
                    "dayType": 'Sunday' if is_sunday else 'Second Saturday',
                })

            current_date += timedelta(days=1)

        return ({
            "success": True,
            "data": {
                "year": year,
                "month": month,
                "holidays": holiday_rows,
                "configured_holidays": [
                    {
                        "id": row.get("id"),
                        "date": row.get("date"),
                        "holidayName": row.get("holiday_name"),
                        "holidayType": row.get("holiday_type"),
                        "description": row.get("description") or '',
                        "status": row.get("status"),
                    }
                    for row in configured_rows
                ],
                "count": len(holiday_rows),
            }
        }, 200)
    except Exception as e:
        return ({
            "success": False,
            "message": str(e)
        }, 500)
    finally:
        cursor.close()
        conn.close()


def create_admin_holiday(payload, created_by_emp_code: str = None):
    holiday_name = (payload.get('holiday_name') or payload.get('holidayName') or '').strip()
    holiday_date_raw = (payload.get('date') or payload.get('holiday_date') or '').strip()
    holiday_type = (payload.get('holiday_type') or payload.get('holidayType') or '').strip()
    description = (payload.get('description') or payload.get('note') or '').strip()
    status = (payload.get('status') or '').strip() or 'Active'

    if not holiday_name:
        return ({
            "success": False,
            "message": "Holiday name is required."
        }, 400)

    if not holiday_date_raw:
        return ({
            "success": False,
            "message": "Date is required. Use YYYY-MM-DD."
        }, 400)

    if not holiday_type:
        return ({
            "success": False,
            "message": "Holiday type is required."
        }, 400)

    if not description:
        return ({
            "success": False,
            "message": "Description or note is required."
        }, 400)

    allowed_types = {'Public Holiday', 'Company Holiday', 'Optional Holiday', 'Weekend'}
    if holiday_type not in allowed_types:
        return ({
            "success": False,
            "message": "Invalid holiday type."
        }, 400)

    allowed_statuses = {'Active', 'Inactive'}
    if status not in allowed_statuses:
        return ({
            "success": False,
            "message": "Invalid status."
        }, 400)

    try:
        holiday_date = datetime.strptime(holiday_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return ({
            "success": False,
            "message": "Invalid date format. Use YYYY-MM-DD."
        }, 400)

    if holiday_date.year < 2000 or holiday_date.year > 2100:
        return ({
            "success": False,
            "message": "Invalid date year. Must be between 2000 and 2100."
        }, 400)

    is_mandatory = holiday_type in {'Public Holiday', 'Company Holiday'}

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        available_columns = _get_organization_holiday_columns(cursor)

        cursor.execute(
            """
            SELECT id, holiday_name
            FROM organization_holidays
            WHERE holiday_date = %s
            LIMIT 1
            """,
            (holiday_date,),
        )
        duplicate_row = cursor.fetchone()
        if duplicate_row:
            return ({
                "success": False,
                "message": f"Holiday already exists for {holiday_date.isoformat()}."
            }, 409)

        insert_columns = ['holiday_date', 'holiday_name']
        insert_values = [holiday_date, holiday_name]

        if 'is_mandatory' in available_columns:
            insert_columns.append('is_mandatory')
            insert_values.append(is_mandatory)
        if 'holiday_type' in available_columns:
            insert_columns.append('holiday_type')
            insert_values.append(holiday_type)
        if 'description' in available_columns:
            insert_columns.append('description')
            insert_values.append(description)
        if 'status' in available_columns:
            insert_columns.append('status')
            insert_values.append(status)
        if 'created_by_emp_code' in available_columns:
            insert_columns.append('created_by_emp_code')
            insert_values.append((created_by_emp_code or '').strip() or None)

        returning_fields = ['id', 'holiday_date', 'holiday_name']
        if 'holiday_type' in available_columns:
            returning_fields.append('holiday_type')
        if 'description' in available_columns:
            returning_fields.append('description')
        if 'status' in available_columns:
            returning_fields.append('status')
        if 'is_mandatory' in available_columns:
            returning_fields.append('is_mandatory')

        placeholders = ", ".join(["%s"] * len(insert_values))
        cursor.execute(
            f"""
            INSERT INTO organization_holidays ({", ".join(insert_columns)})
            VALUES ({placeholders})
            RETURNING {", ".join(returning_fields)}
            """,
            tuple(insert_values),
        )
        inserted = cursor.fetchone()
        conn.commit()

        if hasattr(inserted, 'get'):
            inserted_data = inserted
        elif isinstance(inserted, (tuple, list)):
            inserted_data = {
                field_name: inserted[index]
                for index, field_name in enumerate(returning_fields)
                if index < len(inserted)
            }
        else:
            inserted_data = {}

        parsed = _parse_holiday_row({
            "id": inserted_data.get('id'),
            "holiday_date": inserted_data.get('holiday_date') or holiday_date,
            "holiday_name": inserted_data.get('holiday_name') or holiday_name,
            "holiday_type": inserted_data.get('holiday_type') or holiday_type,
            "description": inserted_data.get('description') or description,
            "status": inserted_data.get('status') or status,
            "is_mandatory": inserted_data.get('is_mandatory', is_mandatory),
        })
        if not parsed:
            raise ValueError("Unable to parse created holiday row")

        return ({
            "success": True,
            "message": "Holiday created successfully.",
            "data": {
                "id": parsed.get("id"),
                "date": parsed.get("date"),
                "holidayName": parsed.get("holiday_name"),
                "holidayType": parsed.get("holiday_type"),
                "description": parsed.get("description"),
                "status": parsed.get("status"),
            }
        }, 201)
    except Exception as e:
        conn.rollback()
        return ({
            "success": False,
            "message": str(e)
        }, 500)
    finally:
        cursor.close()
        conn.close()


def get_calendar_summary(month: int, year: int, department: str = None, emp_code: str = None):
    if month < 1 or month > 12:
        return ({
            "success": False,
            "message": "Invalid month. Use 1-12."
        }, 400)

    if year < 2000 or year > 2100:
        return ({
            "success": False,
            "message": "Invalid year. Must be between 2000 and 2100."
        }, 400)

    department_filter = (department or '').strip()
    emp_code_filter = (emp_code or '').strip()
    start_date = date(year, month, 1)
    end_date = date(year, month, calendar.monthrange(year, month)[1])

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        available_columns = _get_organization_holiday_columns(cursor)
        holiday_select_fields = [
            "id",
            "holiday_date",
            "holiday_name",
            "is_mandatory" if 'is_mandatory' in available_columns else "TRUE AS is_mandatory",
            "holiday_type" if 'holiday_type' in available_columns else "NULL::TEXT AS holiday_type",
            "description" if 'description' in available_columns else "NULL::TEXT AS description",
            "status" if 'status' in available_columns else "'Active'::TEXT AS status",
        ]
        cursor.execute(
            """
            SELECT
                {holiday_select_fields}
            FROM organization_holidays
            WHERE holiday_date BETWEEN %s AND %s
            ORDER BY holiday_date ASC
            """.format(holiday_select_fields=",\n                ".join(holiday_select_fields)),
            (start_date, end_date),
        )
        raw_holidays = cursor.fetchall()

        holidays_by_date = {}
        for row in raw_holidays:
            parsed = _parse_holiday_row(row)
            if not parsed:
                continue
            holidays_by_date[parsed['date']] = parsed

        attendance_query = """
            SELECT
                a.date AS record_date,
                COUNT(
                    DISTINCT COALESCE(
                        NULLIF(LOWER(a.employee_email), ''),
                        NULLIF(LOWER(a.employee_name), ''),
                        CONCAT('attendance-', a.id::text)
                    )
                ) AS attendance_count
            FROM attendance a
            LEFT JOIN employees e ON e.emp_email = a.employee_email
            WHERE a.date BETWEEN %s AND %s
        """
        attendance_params = [start_date, end_date]

        if department_filter:
            attendance_query += " AND LOWER(COALESCE(e.emp_department, '')) = LOWER(%s)"
            attendance_params.append(department_filter)

        if emp_code_filter:
            attendance_query += " AND e.emp_code = %s"
            attendance_params.append(emp_code_filter)

        attendance_query += " GROUP BY a.date"
        cursor.execute(attendance_query, attendance_params)
        attendance_rows = cursor.fetchall()
        attendance_map = {}
        for row in attendance_rows:
            attendance_date = row.get('record_date')
            if isinstance(attendance_date, datetime):
                attendance_date = attendance_date.date()
            if isinstance(attendance_date, date):
                attendance_map[attendance_date.isoformat()] = int(row.get('attendance_count') or 0)

        comp_off_query = """
            SELECT
                c.work_date AS record_date,
                COUNT(*) AS comp_off_count
            FROM comp_offs c
            LEFT JOIN employees e ON e.emp_code = c.emp_code
            WHERE c.work_date BETWEEN %s AND %s
              AND COALESCE(c.comp_off_earned, 0) > 0
              AND LOWER(COALESCE(c.status, '')) <> 'rejected'
        """
        comp_off_params = [start_date, end_date]

        if department_filter:
            comp_off_query += " AND LOWER(COALESCE(e.emp_department, '')) = LOWER(%s)"
            comp_off_params.append(department_filter)

        if emp_code_filter:
            comp_off_query += " AND c.emp_code = %s"
            comp_off_params.append(emp_code_filter)

        comp_off_query += " GROUP BY c.work_date"
        cursor.execute(comp_off_query, comp_off_params)
        comp_off_rows = cursor.fetchall()
        comp_off_map = {}
        for row in comp_off_rows:
            comp_date = row.get('record_date')
            if isinstance(comp_date, datetime):
                comp_date = comp_date.date()
            if isinstance(comp_date, date):
                comp_off_map[comp_date.isoformat()] = int(row.get('comp_off_count') or 0)

        summary_rows = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.isoformat()
            configured = holidays_by_date.get(date_key)
            configured_status = _normalize_holiday_status(configured.get('status')) if configured else 'Active'
            configured_active = bool(configured) and configured_status.lower() == 'active'
            is_sunday = _is_sunday(current_date)
            is_second_saturday = _is_second_saturday(current_date)
            weekend_name = 'Sunday' if is_sunday else 'Second Saturday' if is_second_saturday else None

            is_holiday = bool(weekend_name) or configured_active
            if configured_active:
                holiday_name = configured.get('holiday_name')
                holiday_type = configured.get('holiday_type') or 'Holiday'
                day_type = 'Holiday'
            elif weekend_name:
                holiday_name = weekend_name
                holiday_type = 'Weekend'
                day_type = weekend_name
            else:
                holiday_name = None
                holiday_type = None
                day_type = 'Working Day'

            summary_rows.append({
                "date": date_key,
                "attendanceCount": int(attendance_map.get(date_key, 0)),
                "compOffCount": int(comp_off_map.get(date_key, 0)),
                "isHoliday": is_holiday,
                "holidayName": holiday_name,
                "holidayType": holiday_type,
                "isSunday": is_sunday,
                "isSecondSaturday": is_second_saturday,
                "dayType": day_type,
                "holidayStatus": configured_status if configured else None,
                "holidayDescription": (configured.get('description') or '') if configured else '',
            })

            current_date += timedelta(days=1)

        return ({
            "success": True,
            "data": {
                "month": month,
                "year": year,
                "department": department_filter or None,
                "emp_code": emp_code_filter or None,
                "summary": summary_rows,
                "count": len(summary_rows),
            }
        }, 200)
    except Exception as e:
        return ({
            "success": False,
            "message": str(e)
        }, 500)
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
