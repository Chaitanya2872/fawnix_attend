"""
Attendance Heatmap Service

Derives the monthly per-employee / per-day attendance status matrix rendered by
the admin Reports heatmap, and stores manual per-cell corrections.

Status codes:
    P   present in office
    S   present at a site
    WFH work from home (manual correction only - not tracked on login)
    A   absent
    L   approved leave
    H   organization holiday
    O   week off (Sunday, second/fourth Saturday)

Every cell is derived on demand from the attendance/leave/holiday tables, then
overlaid with rows from attendance_day_overrides, which carry source='manual'.
"""

from database.connection import get_db_connection, return_connection
from datetime import date, datetime, timedelta
import calendar

from services.admin_service import (
    _get_employee_joined_date_select_expression,
    _get_employees_columns,
    _get_organization_holiday_columns,
    _is_fourth_saturday,
    _is_second_saturday,
    _is_sunday,
    _normalize_holiday_status,
)

VALID_STATUS_CODES = ('P', 'S', 'WFH', 'A', 'L', 'H', 'O')

SOURCE_AUTO = 'auto'
SOURCE_MANUAL = 'manual'


def _month_bounds(month: int, year: int):
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _coerce_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.strptime(value.strip()[:10], '%Y-%m-%d').date()
        except ValueError:
            return None
    return None


def normalize_status_code(value):
    """Return a canonical status code, or None when the value is not a status."""
    normalized = str(value or '').strip().upper()
    return normalized if normalized in VALID_STATUS_CODES else None


def _fetch_employees(cursor):
    employee_columns = _get_employees_columns(cursor)
    joined_date_select = _get_employee_joined_date_select_expression(employee_columns)

    cursor.execute("""
        SELECT
            e.emp_code,
            e.emp_full_name,
            e.emp_email,
            e.emp_designation,
            e.emp_department,
            {joined_date_select}
        FROM employees e
        LEFT JOIN users u ON e.emp_code = u.emp_code
        WHERE COALESCE(u.is_active, TRUE) = TRUE
        ORDER BY e.emp_full_name, e.emp_code
    """.format(joined_date_select=joined_date_select))

    return cursor.fetchall()


def _fetch_attendance_by_day(cursor, start_date: date, end_date: date):
    """Collapse the raw attendance sessions into one entry per employee-day."""
    cursor.execute("""
        SELECT
            e.emp_code,
            a.date,
            a.attendance_type,
            a.working_hours,
            a.login_time,
            a.logout_time
        FROM attendance a
        JOIN employees e ON a.employee_email = e.emp_email
        WHERE a.date BETWEEN %s AND %s
        ORDER BY a.date ASC, a.login_time ASC
    """, (start_date, end_date))

    attendance_by_day = {}
    for row in cursor.fetchall():
        emp_code = (row.get('emp_code') or '').strip()
        attendance_date = _coerce_date(row.get('date'))
        if not emp_code or not attendance_date:
            continue

        working_hours = row.get('working_hours')
        if working_hours is None:
            login_time = row.get('login_time')
            logout_time = row.get('logout_time')
            if isinstance(login_time, datetime) and isinstance(logout_time, datetime):
                elapsed_hours = (logout_time - login_time).total_seconds() / 3600
                working_hours = round(elapsed_hours, 2) if elapsed_hours >= 0 else None

        is_site = (row.get('attendance_type') or '').strip().lower() == 'site'
        key = (emp_code, attendance_date)
        entry = attendance_by_day.get(key)

        if entry is None:
            attendance_by_day[key] = {
                'status': 'S' if is_site else 'P',
                'working_hours': float(working_hours) if working_hours is not None else None,
            }
            continue

        # Multiple sessions on one day: hours add up, and a site visit wins the label.
        if working_hours is not None:
            entry['working_hours'] = round((entry['working_hours'] or 0) + float(working_hours), 2)
        if is_site:
            entry['status'] = 'S'

    return attendance_by_day


def _fetch_leave_days(cursor, start_date: date, end_date: date):
    """Expand approved leave ranges into the individual employee-days they cover."""
    cursor.execute("""
        SELECT emp_code, from_date, to_date, leave_type, duration
        FROM leaves
        WHERE status = 'approved'
          AND from_date <= %s
          AND to_date >= %s
    """, (end_date, start_date))

    leave_days = {}
    for row in cursor.fetchall():
        emp_code = (row.get('emp_code') or '').strip()
        from_date = _coerce_date(row.get('from_date'))
        to_date = _coerce_date(row.get('to_date'))
        if not emp_code or not from_date or not to_date:
            continue

        current_date = max(from_date, start_date)
        final_date = min(to_date, end_date)
        label = (row.get('leave_type') or '').strip().title()
        duration = (row.get('duration') or '').strip().replace('_', ' ')
        remarks = ' '.join(part for part in (label, 'leave', f'({duration})' if duration else '') if part).strip()

        while current_date <= final_date:
            leave_days[(emp_code, current_date)] = remarks
            current_date += timedelta(days=1)

    return leave_days


def _fetch_holidays(cursor, start_date: date, end_date: date):
    """Active configured organization holidays, keyed by date."""
    available_columns = _get_organization_holiday_columns(cursor)
    status_select = "status" if 'status' in available_columns else "'Active'::TEXT AS status"
    cursor.execute("""
        SELECT holiday_date, holiday_name, {status_select}
        FROM organization_holidays
        WHERE holiday_date BETWEEN %s AND %s
    """.format(status_select=status_select), (start_date, end_date))

    holidays = {}
    for row in cursor.fetchall():
        holiday_date = _coerce_date(row.get('holiday_date'))
        if not holiday_date:
            continue
        if _normalize_holiday_status(row.get('status')).lower() != 'active':
            continue
        holidays[holiday_date] = (row.get('holiday_name') or 'Holiday').strip()

    return holidays


def _fetch_overrides(cursor, start_date: date, end_date: date):
    cursor.execute("""
        SELECT emp_code, override_date, status, remarks
        FROM attendance_day_overrides
        WHERE override_date BETWEEN %s AND %s
    """, (start_date, end_date))

    overrides = {}
    for row in cursor.fetchall():
        emp_code = (row.get('emp_code') or '').strip()
        override_date = _coerce_date(row.get('override_date'))
        status = normalize_status_code(row.get('status'))
        if not emp_code or not override_date or not status:
            continue
        overrides[(emp_code, override_date)] = {
            'status': status,
            'remarks': row.get('remarks') or None,
        }

    return overrides


def _is_week_off(target_date: date) -> bool:
    return _is_sunday(target_date) or _is_second_saturday(target_date) or _is_fourth_saturday(target_date)


def _derive_cell(target_date, attendance, leave_remarks, holiday_name):
    """Attendance beats leave, leave beats the calendar, everything beats absent."""
    if attendance:
        return attendance['status'], attendance.get('working_hours'), None
    if leave_remarks is not None:
        return 'L', None, leave_remarks or None
    if holiday_name:
        return 'H', None, holiday_name
    if _is_week_off(target_date):
        return 'O', None, None
    return 'A', None, None


def get_attendance_heatmap(month: int, year: int):
    """
    Build the monthly status matrix.

    Days before an employee joined and days later than today are omitted rather
    than reported as absent - the heatmap renders a missing day as "no data".
    """
    if month < 1 or month > 12:
        return ({"success": False, "message": "Invalid month. Use 1-12."}, 400)

    if year < 2000 or year > 2100:
        return ({"success": False, "message": "Invalid year. Must be between 2000 and 2100."}, 400)

    start_date, end_date = _month_bounds(month, year)
    today = date.today()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        employees = _fetch_employees(cursor)
        attendance_by_day = _fetch_attendance_by_day(cursor, start_date, end_date)
        leave_days = _fetch_leave_days(cursor, start_date, end_date)
        holidays = _fetch_holidays(cursor, start_date, end_date)
        overrides = _fetch_overrides(cursor, start_date, end_date)

        employee_rows = []
        for employee in employees:
            emp_code = (employee.get('emp_code') or '').strip()
            if not emp_code:
                continue

            joined_date = _coerce_date(employee.get('emp_joined_date'))
            days = []
            current_date = start_date

            while current_date <= end_date:
                if current_date > today or (joined_date and current_date < joined_date):
                    current_date += timedelta(days=1)
                    continue

                attendance = attendance_by_day.get((emp_code, current_date))
                override = overrides.get((emp_code, current_date))

                if override:
                    status = override['status']
                    remarks = override['remarks']
                    working_hours = attendance.get('working_hours') if attendance else None
                    source = SOURCE_MANUAL
                else:
                    status, working_hours, remarks = _derive_cell(
                        current_date,
                        attendance,
                        leave_days.get((emp_code, current_date)),
                        holidays.get(current_date),
                    )
                    source = SOURCE_AUTO

                days.append({
                    "date": current_date.isoformat(),
                    "status": status,
                    "working_hours": working_hours,
                    "source": source,
                    "remarks": remarks,
                })
                current_date += timedelta(days=1)

            employee_rows.append({
                "emp_code": emp_code,
                "emp_full_name": employee.get('emp_full_name') or emp_code,
                "emp_designation": employee.get('emp_designation') or '',
                "emp_department": employee.get('emp_department') or '',
                "emp_joined_date": joined_date.isoformat() if joined_date else None,
                "days": days,
            })

        return ({
            "success": True,
            "month": month,
            "year": year,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "employees": employee_rows,
        }, 200)

    finally:
        cursor.close()
        return_connection(conn)


def update_attendance_day(emp_code: str, target_date: str, status: str, updated_by_emp_code: str = None):
    """Upsert a manual correction for one employee-day and return the new cell."""
    normalized_emp_code = (emp_code or '').strip()
    if not normalized_emp_code:
        return ({"success": False, "message": "emp_code is required."}, 400)

    parsed_date = _coerce_date(target_date)
    if not parsed_date:
        return ({"success": False, "message": "Invalid date. Use YYYY-MM-DD."}, 400)

    normalized_status = normalize_status_code(status)
    if not normalized_status:
        return ({
            "success": False,
            "message": f"Invalid status. Use one of {', '.join(VALID_STATUS_CODES)}."
        }, 400)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT emp_code FROM employees WHERE emp_code = %s",
            (normalized_emp_code,),
        )
        if not cursor.fetchone():
            return ({"success": False, "message": "Employee not found."}, 404)

        cursor.execute("""
            INSERT INTO attendance_day_overrides (emp_code, override_date, status, updated_by_emp_code)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (emp_code, override_date)
            DO UPDATE SET
                status = EXCLUDED.status,
                updated_by_emp_code = EXCLUDED.updated_by_emp_code,
                updated_at = CURRENT_TIMESTAMP
            RETURNING emp_code, override_date, status, remarks
        """, (normalized_emp_code, parsed_date, normalized_status, (updated_by_emp_code or '').strip() or None))

        saved = cursor.fetchone()

        cursor.execute("""
            SELECT a.working_hours, a.login_time, a.logout_time
            FROM attendance a
            JOIN employees e ON a.employee_email = e.emp_email
            WHERE e.emp_code = %s AND a.date = %s
            ORDER BY a.login_time ASC
        """, (normalized_emp_code, parsed_date))

        working_hours = None
        for row in cursor.fetchall():
            hours = row.get('working_hours')
            if hours is None:
                login_time = row.get('login_time')
                logout_time = row.get('logout_time')
                if isinstance(login_time, datetime) and isinstance(logout_time, datetime):
                    elapsed_hours = (logout_time - login_time).total_seconds() / 3600
                    hours = elapsed_hours if elapsed_hours >= 0 else None
            if hours is not None:
                working_hours = round((working_hours or 0) + float(hours), 2)

        conn.commit()

        return ({
            "success": True,
            "message": "Attendance updated.",
            "cell": {
                "emp_code": normalized_emp_code,
                "date": parsed_date.isoformat(),
                "status": normalize_status_code(saved.get('status')) if saved else normalized_status,
                "working_hours": working_hours,
                "source": SOURCE_MANUAL,
                "remarks": (saved.get('remarks') if saved else None) or None,
            },
        }, 200)

    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        return_connection(conn)
