# services/auto_clockout_service.py
"""
Auto Clock-out Service
Automatically clocks out employees at shift end time.

✅ FIXED:
- Removed the time guard that conflicted with the scheduler
  (The SCHEDULER decides WHEN to call this. This service just EXECUTES.)
- Added per-employee shift-aware clock-out time
- Better error handling with per-employee rollback
"""

from datetime import datetime, time, date
from database.connection import get_db_connection, return_connection
from services.geocoding_service import get_address_from_coordinates
from services.CompLeaveService import calculate_and_record_compoff
import logging

logger = logging.getLogger(__name__)

# ==========================================
# Configuration
# ==========================================
WEEKDAY_CLOCKOUT_TIME = time(18, 30, 0)  # 6:30 PM (Mon-Fri)
SATURDAY_HALFDAY_CLOCKOUT_TIME = time(13, 0, 0)  # 1:00 PM (Saturday half-days)
AUTO_CLOCKOUT_LOCATION = "Auto Clock-Out Location"

# Saturday half-day configuration: 1st, 3rd, 5th Saturday are half days
SATURDAY_HALFDAY_WEEKENDS = [1, 3, 5]


def is_saturday_halfday(check_date: date) -> bool:
    """
    Check if given date is a Saturday half-day (1st, 3rd, or 5th Saturday of month)
    """
    if check_date.weekday() != 5:  # 5 = Saturday
        return False

    day_of_month = check_date.day
    saturday_occurrence = (day_of_month - 1) // 7 + 1

    return saturday_occurrence in SATURDAY_HALFDAY_WEEKENDS


def get_auto_clockout_time(check_date: date) -> time:
    """
    Get the appropriate auto-clockout time based on day of week.
    Returns: 6:30 PM for weekdays, 1:00 PM for Saturday half-days
    """
    if is_saturday_halfday(check_date):
        logger.info(f"📅 {check_date.strftime('%A, %B %d')} is Saturday half-day → using {SATURDAY_HALFDAY_CLOCKOUT_TIME.strftime('%H:%M')}")
        return SATURDAY_HALFDAY_CLOCKOUT_TIME
    else:
        return WEEKDAY_CLOCKOUT_TIME


def _to_time(value):
    """Convert DB time values to Python time."""
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        try:
            return datetime.strptime(value, '%H:%M:%S').time()
        except ValueError:
            return None
    return None


def _safe_close_related_records(cursor, attendance_id, logout_datetime):
    """
    Close related activity/field-visit records without aborting
    the full employee clock-out when optional tables/columns drift.
    """
    activities_closed = 0
    field_visits_closed = 0

    cursor.execute("SAVEPOINT sp_auto_cleanup")
    try:
        cursor.execute("""
            UPDATE activities
            SET
                end_time = %s,
                status = 'completed',
                duration_minutes = EXTRACT(EPOCH FROM (%s - start_time))/60
            WHERE
                attendance_id = %s
                AND status = 'active'
        """, (logout_datetime, logout_datetime, attendance_id))
        activities_closed = cursor.rowcount
        cursor.execute("RELEASE SAVEPOINT sp_auto_cleanup")
    except Exception as e:
        cursor.execute("ROLLBACK TO SAVEPOINT sp_auto_cleanup")
        cursor.execute("RELEASE SAVEPOINT sp_auto_cleanup")
        logger.warning(f"  ⚠️ Skipped activities cleanup for attendance {attendance_id}: {e}")

    cursor.execute("SAVEPOINT sp_field_visit_cleanup")
    try:
        cursor.execute("""
            UPDATE field_visits
            SET
                end_time = %s,
                status = 'completed',
                duration_minutes = EXTRACT(EPOCH FROM (%s - start_time))/60
            WHERE
                attendance_id = %s
                AND status = 'active'
        """, (logout_datetime, logout_datetime, attendance_id))
        field_visits_closed = cursor.rowcount
        cursor.execute("RELEASE SAVEPOINT sp_field_visit_cleanup")
    except Exception as e:
        cursor.execute("ROLLBACK TO SAVEPOINT sp_field_visit_cleanup")
        cursor.execute("RELEASE SAVEPOINT sp_field_visit_cleanup")
        logger.warning(f"  ⚠️ Skipped field visit cleanup for attendance {attendance_id}: {e}")

    return activities_closed, field_visits_closed


def auto_clockout_all_active_sessions():
    """
    ✅ FIXED: Auto clock-out all employees who are still logged in.

    Called by the scheduler at the correct time. This function:
    - Finds all active sessions
    - Auto-closes activities and field visits
    - Calculates working hours
    - Calculates comp-off eligibility
    - Marks records with auto_clocked_out flag

    NOTE: We no longer check if current_time >= auto_clockout_time here.
    The SCHEDULER is responsible for calling this at the right time.
    This allows the midnight safety net to also work.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_time = datetime.now()
        current_date = current_time.date()
        auto_clockout_time = get_auto_clockout_time(current_date)

        logger.info(f"⏰ Auto clock-out job running at {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"⏰ Today: {current_date.strftime('%A, %B %d, %Y')}")
        logger.info(f"⏰ Configured auto-clockout time: {auto_clockout_time.strftime('%H:%M:%S')}")

        # Find all active sessions, regardless of work date.
        # This catches missed sessions from prior days too.
        cursor.execute("""
            SELECT
                a.id as attendance_id,
                a.employee_email,
                a.employee_name,
                a.login_time,
                a.login_location,
                a.date,
                e.emp_code,
                e.emp_shift_id,
                s.shift_end_time
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
            LEFT JOIN shifts s ON e.emp_shift_id = s.shift_id
            WHERE a.logout_time IS NULL
            ORDER BY a.login_time ASC
        """)

        active_sessions = cursor.fetchall()

        logger.info(f"📊 Found {len(active_sessions) if active_sessions else 0} active sessions")

        if not active_sessions:
            logger.info("✅ No active sessions to auto clock-out")
            return {
                "success": True,
                "message": "No active sessions found",
                "auto_clocked_out": 0
            }

        auto_clocked_out = []
        errors = []

        for session in active_sessions:
            cursor.execute("SAVEPOINT sp_auto_clockout_employee")
            try:
                result = _auto_clockout_single_employee(cursor, session, current_time)
                cursor.execute("RELEASE SAVEPOINT sp_auto_clockout_employee")
                if result:
                    auto_clocked_out.append(result)
            except Exception as e:
                cursor.execute("ROLLBACK TO SAVEPOINT sp_auto_clockout_employee")
                cursor.execute("RELEASE SAVEPOINT sp_auto_clockout_employee")
                emp_email = session.get('employee_email', 'unknown')
                logger.error(f"❌ Error auto clocking-out {emp_email}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                errors.append({"employee": emp_email, "error": str(e)})
                continue

        conn.commit()

        logger.info(f"✅ Auto clock-out completed: {len(auto_clocked_out)} employees processed, {len(errors)} errors")

        return {
            "success": True,
            "message": f"Successfully auto clocked-out {len(auto_clocked_out)} employees",
            "auto_clocked_out": len(auto_clocked_out),
            "details": auto_clocked_out,
            "errors": errors if errors else None,
            "timestamp": current_time.strftime('%Y-%m-%d %H:%M:%S')
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Auto clock-out error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
            "auto_clocked_out": 0
        }
    finally:
        cursor.close()
        return_connection(conn)


def _auto_clockout_single_employee(cursor, session, current_time):
    """
    Process auto clock-out for a single employee.
    Extracted for cleaner error handling.
    """
    attendance_id = session['attendance_id']
    emp_email = session['employee_email']
    emp_name = session['employee_name']
    emp_code = session['emp_code']
    login_time = session['login_time']
    work_date = session['date']
    if isinstance(work_date, datetime):
        work_date = work_date.date()

    logger.info(f"🔄 Processing auto clock-out for {emp_email} (attendance_id: {attendance_id})")

    # ✅ Use per-employee shift end time if available, otherwise use configured time
    shift_end = _to_time(session.get('shift_end_time'))
    if shift_end:
        logout_time_of_day = shift_end
        logger.info(f"  ⏱️  Using employee's shift end time: {shift_end}")
    else:
        logout_time_of_day = get_auto_clockout_time(work_date)
        logger.info(f"  ⏱️  Using default auto-clockout time: {logout_time_of_day}")

    # Use the attendance work_date so late/missed jobs don't generate future logout timestamps.
    logout_datetime = datetime.combine(work_date, logout_time_of_day)

    # Safety: never write a future logout time.
    if logout_datetime > current_time:
        logout_datetime = current_time
        logger.warning(f"  ⚠️ Computed logout time was in future — using current time {current_time}")

    # Safety: if computed logout is before login, use current time.
    if logout_datetime < login_time:
        logout_datetime = current_time
        logger.warning(f"  ⚠️ Logout time ({logout_time_of_day}) < login time ({login_time.time()}) — using current time")

    # Use login location for logout
    logout_location = session.get('login_location', '')
    coords = logout_location.split(', ') if logout_location else ['', '']
    lat = coords[0] if len(coords) > 0 else ''
    lon = coords[1] if len(coords) > 1 else ''

    logout_address = get_address_from_coordinates(lat, lon) if lat and lon else AUTO_CLOCKOUT_LOCATION

    # Calculate working hours
    duration = logout_datetime - login_time
    working_hours = duration.total_seconds() / 3600

    logger.info(f"  📍 Logout location: {logout_location}")
    logger.info(f"  ⏱️  Working hours: {working_hours:.2f}h")

    activities_closed, field_visits_closed = _safe_close_related_records(
        cursor, attendance_id, logout_datetime
    )
    logger.info(f"  🧹 Closed {activities_closed} active activities")
    logger.info(f"  🧹 Closed {field_visits_closed} active field visits")

    # Update attendance record
    cursor.execute("""
        UPDATE attendance
        SET
            logout_time = %s,
            logout_location = %s,
            logout_address = %s,
            working_hours = %s,
            status = %s,
            auto_clocked_out = true,
            auto_clockout_reason = %s
        WHERE id = %s
    """, (
        logout_datetime,
        logout_location,
        logout_address,
        round(working_hours, 2),
        'logged_out',
        f'Auto clocked-out at {logout_time_of_day.strftime("%H:%M:%S")}',
        attendance_id
    ))

    # Calculate comp-off if eligible
    comp_off_result = None
    if emp_code:
        try:
            comp_off_result = calculate_and_record_compoff(
                attendance_id=attendance_id,
                emp_code=emp_code,
                emp_email=emp_email,
                emp_name=emp_name,
                work_date=work_date,
                login_time=login_time,
                logout_time=logout_datetime
            )
            logger.info(f"  💰 Comp-off calculated: {comp_off_result.get('comp_off_days', 0) if comp_off_result else 0} days")
        except Exception as e:
            logger.error(f"  ⚠️ Comp-off calculation failed for {emp_email}: {e}")

    logger.info(f"✅ Auto clocked-out: {emp_email} — {working_hours:.2f}h (Activities: {activities_closed}, Field Visits: {field_visits_closed})")

    return {
        "attendance_id": attendance_id,
        "employee_email": emp_email,
        "employee_name": emp_name,
        "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
        "logout_time": logout_datetime.strftime('%Y-%m-%d %H:%M:%S'),
        "working_hours": round(working_hours, 2),
        "activities_closed": activities_closed,
        "field_visits_closed": field_visits_closed,
        "comp_off_earned": comp_off_result['comp_off_days'] if comp_off_result else 0
    }


def manual_trigger_auto_clockout():
    """
    Manual trigger for testing auto clockout (bypasses time check).
    Use this for testing purposes only.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_time = datetime.now()

        logger.info(f"🧪 MANUAL AUTO CLOCK-OUT TRIGGERED at {current_time}")

        # Find all active sessions (no time/day check)
        cursor.execute("""
            SELECT
                a.id as attendance_id,
                a.employee_email,
                a.employee_name,
                a.login_time,
                a.login_location,
                a.date,
                e.emp_code,
                e.emp_shift_id,
                s.shift_end_time
            FROM attendance a
            LEFT JOIN employees e ON a.employee_email = e.emp_email
            LEFT JOIN shifts s ON e.emp_shift_id = s.shift_id
            WHERE a.logout_time IS NULL
            ORDER BY a.login_time ASC
        """)

        active_sessions = cursor.fetchall()

        if not active_sessions:
            logger.info("✅ No active sessions to auto clock-out")
            return {
                "success": True,
                "message": "No active sessions found",
                "auto_clocked_out": 0
            }

        auto_clocked_out = []
        errors = []

        for session in active_sessions:
            cursor.execute("SAVEPOINT sp_manual_auto_clockout_employee")
            try:
                attendance_id = session['attendance_id']
                emp_email = session['employee_email']
                emp_name = session['employee_name']
                emp_code = session['emp_code']
                login_time = session['login_time']
                work_date = session['date']
                if isinstance(work_date, datetime):
                    work_date = work_date.date()

                logout_datetime = current_time

                logout_location = session.get('login_location', '')
                coords = logout_location.split(', ') if logout_location else ['', '']
                lat = coords[0] if len(coords) > 0 else ''
                lon = coords[1] if len(coords) > 1 else ''

                logout_address = get_address_from_coordinates(lat, lon) if lat and lon else AUTO_CLOCKOUT_LOCATION

                duration = logout_datetime - login_time
                working_hours = duration.total_seconds() / 3600

                activities_closed, field_visits_closed = _safe_close_related_records(
                    cursor, attendance_id, logout_datetime
                )

                # Update attendance record
                cursor.execute("""
                    UPDATE attendance
                    SET
                        logout_time = %s,
                        logout_location = %s,
                        logout_address = %s,
                        working_hours = %s,
                        status = %s,
                        auto_clocked_out = true,
                        auto_clockout_reason = %s
                    WHERE id = %s
                """, (
                    logout_datetime,
                    logout_location,
                    logout_address,
                    round(working_hours, 2),
                    'logged_out',
                    f'Manual auto clock-out triggered at {current_time.strftime("%H:%M:%S")}',
                    attendance_id
                ))

                # Calculate comp-off
                comp_off_result = None
                if emp_code:
                    try:
                        comp_off_result = calculate_and_record_compoff(
                            attendance_id=attendance_id,
                            emp_code=emp_code,
                            emp_email=emp_email,
                            emp_name=emp_name,
                            work_date=work_date,
                            login_time=login_time,
                            logout_time=logout_datetime
                        )
                    except Exception as e:
                        logger.error(f"⚠️ Comp-off calculation failed for {emp_email}: {e}")

                auto_clocked_out.append({
                    "attendance_id": attendance_id,
                    "employee_email": emp_email,
                    "employee_name": emp_name,
                    "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
                    "logout_time": logout_datetime.strftime('%Y-%m-%d %H:%M:%S'),
                    "working_hours": round(working_hours, 2),
                    "activities_closed": activities_closed,
                    "field_visits_closed": field_visits_closed,
                    "comp_off_earned": comp_off_result['comp_off_days'] if comp_off_result else 0
                })

                logger.info(f"✅ Manual auto clocked-out: {emp_email} — {working_hours:.2f}h")
                cursor.execute("RELEASE SAVEPOINT sp_manual_auto_clockout_employee")

            except Exception as e:
                cursor.execute("ROLLBACK TO SAVEPOINT sp_manual_auto_clockout_employee")
                cursor.execute("RELEASE SAVEPOINT sp_manual_auto_clockout_employee")
                logger.error(f"❌ Error in manual auto clock-out for {session.get('employee_email')}: {e}")
                errors.append({
                    "employee": session.get('employee_email', 'unknown'),
                    "error": str(e)
                })
                continue

        conn.commit()

        logger.info(f"✅ Manual auto clock-out completed: {len(auto_clocked_out)} employees")

        return {
            "success": True,
            "message": f"Manual auto clock-out successful: {len(auto_clocked_out)} employees",
            "auto_clocked_out": len(auto_clocked_out),
            "details": auto_clocked_out,
            "errors": errors if errors else None,
            "timestamp": current_time.strftime('%Y-%m-%d %H:%M:%S')
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Manual auto clock-out error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
            "auto_clocked_out": 0
        }
    finally:
        cursor.close()
        return_connection(conn)
