"""
Updated Attendance Service
Version 3.0 - With late arrival auto-detection and early leave validation

NEW FEATURES:
✅ Auto-detects late arrival on clock-in
✅ Validates early leave approval before clock-out
✅ No more late_arrival/early_leave activities
✅ Second clock-in on any non-working day automatically recorded as comp-off
  (holidays, Sundays, 2nd/4th Saturdays, and 1st/3rd/5th Saturdays)
"""

from datetime import datetime, timedelta, date
import json
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
from services.CompLeaveService import calculate_and_record_compoff, is_working_day
from services.attendance_exceptions_service import (
    auto_detect_late_arrival,
    attach_pending_late_arrival_to_attendance,
    check_early_leave_approval,
    get_employee_shift_times,
    _fetch_exception_rows_by_attendance_ids,
)
from services.attendance_notification_service import notify_tracking_started, notify_tracking_stopped
from utils.time_utils import now_local_naive
import logging

logger = logging.getLogger(__name__)


VALID_ATTENDANCE_TYPES = {"office", "site"}


def _normalize_attendance_type(attendance_type: str | None) -> str:
    normalized = (attendance_type or "office").strip().lower()
    if normalized not in VALID_ATTENDANCE_TYPES:
        raise ValueError("attendance_type must be either 'office' or 'site'")
    return normalized


def _create_site_clock_in_field_visit(
    cursor,
    attendance_id: int,
    emp_email: str,
    emp_name: str,
    lat: str,
    lon: str,
    address: str,
    start_time: datetime,
):
    destination = {
        "sequence": 1,
        "name": "Clock-in site",
        "latitude": lat,
        "longitude": lon,
        "coordinates": f"{lat}, {lon}",
        "address": address,
        "visited": False,
        "visited_at": None,
    }
    destinations_json = json.dumps([destination])

    cursor.execute(
        """
        INSERT INTO field_visits (
            attendance_id, employee_email, employee_name,
            visit_type, purpose,
            start_time, date,
            start_latitude, start_longitude, start_address,
            status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            attendance_id,
            emp_email,
            emp_name,
            'field_visit',
            'Auto-started from site clock-in',
            start_time,
            start_time.date(),
            lat,
            lon,
            address,
            'active',
        ),
    )
    field_visit_id = cursor.fetchone()['id']

    cursor.execute(
        """
        INSERT INTO activities (
            attendance_id, field_visit_id,
            employee_email, employee_name, activity_type,
            start_time, start_location, start_address,
            notes, date, status, destinations
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            attendance_id,
            field_visit_id,
            emp_email,
            emp_name,
            'field_visit',
            start_time,
            f"{lat}, {lon}",
            address,
            'Auto-started from site clock-in',
            start_time.date(),
            'active',
            destinations_json,
        ),
    )
    activity_id = cursor.fetchone()['id']

    cursor.execute(
        """
        INSERT INTO location_tracking (
            activity_id, employee_email, location, address,
            tracked_at, tracking_type
        ) VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            activity_id,
            emp_email,
            f"{lat}, {lon}",
            address,
            start_time,
            'initial',
        ),
    )
    initial_tracking_id = cursor.fetchone()['id']

    return {
        "activity_id": activity_id,
        "field_visit_id": field_visit_id,
        "tracking_enabled": True,
        "tracking_interval": "3 minutes",
        "initial_tracking_id": initial_tracking_id,
        "destinations": [destination],
    }


def clock_in(emp_email: str, emp_name: str, phone: str, lat: str, lon: str, attendance_type: str | None = None):
    """
    Clock in employee with late arrival auto-detection
    
    NEW: Automatically detects if employee is late and returns detection info
    """
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''

    try:
        normalized_attendance_type = _normalize_attendance_type(attendance_type)
    except ValueError as e:
        return ({"success": False, "message": str(e)}, 400)

    if normalized_attendance_type == "site" and (not lat or not lon):
        return ({
            "success": False,
            "message": "latitude and longitude are required for site attendance"
        }, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 🔒 GUARD: Check for active session
        cursor.execute("""
            SELECT id, login_time FROM attendance
            WHERE employee_email = %s AND logout_time IS NULL
        """, (emp_email,))

        active_session = cursor.fetchone()

        if active_session:
            login_time_str = active_session['login_time'].strftime('%H:%M:%S') if isinstance(active_session['login_time'], datetime) else str(active_session['login_time'])
            return ({
                "success": False,
                "message": f"Already clocked in at {login_time_str}. Please clock out first.",
                "data": {
                    "active_attendance_id": active_session['id'],
                    "login_time": str(active_session['login_time'])
                }
            }, 400)

        # ✅ Check for NON-WORKING day second clock-in (Comp-off)
        # Non-working days: Sundays, Holidays, 2nd/4th Saturdays
        login_time = now_local_naive()
        login_date = login_time.date()
        
        # Get emp_code first for working day check
        cursor.execute("""
            SELECT emp_code FROM employees WHERE emp_email = %s
        """, (emp_email,))
        
        emp_result = cursor.fetchone()
        emp_code = emp_result['emp_code'] if emp_result else None
        
        # Check if it's a non-working day
        is_nonworking = False
        day_type = None
        if emp_code:
            is_working, day_type = is_working_day(login_date, emp_code)
            is_nonworking = not is_working
        
        if is_nonworking:
            # Check if already has a clocked-out session today
            cursor.execute("""
                SELECT id, login_time, logout_time, working_hours
                FROM attendance
                WHERE employee_email = %s AND date = %s AND logout_time IS NOT NULL
                LIMIT 1
            """, (emp_email, login_date))
            
            previous_session = cursor.fetchone()
            
            if previous_session:
                # On non-working days, only first clock-in is allowed
                logger.warning(f"❌ Non-working day ({login_date.strftime('%A')}) - Second clock-in not allowed for {emp_email}")
                return ({
                    "success": False,
                    "message": f"On non-working days ({login_date.strftime('%A')}), only ONE clock-in per day is allowed. You already clocked out at {previous_session['logout_time'].strftime('%H:%M:%S')}.",
                    "data": {
                        "reason": "non_working_day_single_clockin_only",
                        "day_type": "non_working_day",
                        "day_of_week": login_date.strftime('%A'),
                        "previous_logout_time": previous_session['logout_time'].strftime('%Y-%m-%d %H:%M:%S')
                    }
                }, 400)
            else:
                logger.info(f"📅 Non-working day ({login_date.strftime('%A')}) detected for {emp_email} - First clock-in allowed, will be eligible for comp-off")
        
        # ✅ Normal clock-in flow
        
        cursor.execute("""
            INSERT INTO attendance (
                employee_email, employee_name, phone_number,
                login_time, login_location, login_address,
                date, status, attendance_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_email, emp_name, phone,
            login_time, location, address,
            login_time.date(), 'logged_in', normalized_attendance_type
        ))
        
        attendance_id = cursor.fetchone()['id']
        
        site_visit_info = None

        # ✅ No need to mark comp-off session on non-working days
        # First clock-in on non-working days is automatically eligible for comp-off
        is_compoff_session = is_nonworking  # Mark as comp-off eligible since it's a non-working day
        
        # On working days, comp-off starts from SECOND completed session in the same date
        if not is_compoff_session and emp_code:
            cursor.execute("""
                SELECT COUNT(*) as cnt
                FROM attendance
                WHERE employee_email = %s AND date = %s AND logout_time IS NOT NULL
            """, (emp_email, login_date))
            count_row = cursor.fetchone()
            prev_completed = int(count_row['cnt'] or 0) if count_row else 0
            if prev_completed >= 1:
                # Mark this new session as comp-off session
                cursor.execute("""
                    UPDATE attendance SET is_compoff_session = TRUE
                    WHERE id = %s
                """, (attendance_id,))
                is_compoff_session = True
                logger.info(f"📅 Working day second session -> comp-off eligible: {emp_email} on {login_date.strftime('%A')}")
        
        if is_compoff_session:
            logger.info(f"📅 Non-working day comp-off eligible session registered: {emp_email} on {login_date.strftime('%A')}")

        # Use the persisted attendance flag for response behavior.
        cursor.execute("""
            SELECT COALESCE(is_compoff_session, FALSE) AS is_compoff_session
            FROM attendance
            WHERE id = %s
        """, (attendance_id,))
        persisted_attendance = cursor.fetchone()
        is_compoff_session = bool(
            persisted_attendance and persisted_attendance.get('is_compoff_session')
        )

        if normalized_attendance_type == 'site':
            site_visit_info = _create_site_clock_in_field_visit(
                cursor,
                attendance_id,
                emp_email,
                emp_name,
                lat,
                lon,
                address,
                login_time,
            )
        
        conn.commit()

        logger.info(f"✅ Clock in successful: {emp_email} - Attendance ID: {attendance_id}")

        if emp_code:
            try:
                notify_tracking_started(emp_code, attendance_id)
            except Exception as notification_error:
                logger.error(
                    "Non-critical tracking_started notification failure for %s attendance=%s: %s",
                    emp_code,
                    attendance_id,
                    notification_error,
                )
        
        response_data = {
            "attendance_id": attendance_id,
            "attendance_type": normalized_attendance_type,
            "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
            "location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            }
        }
        if site_visit_info:
            response_data["site_visit"] = site_visit_info
        
        # Skip late arrival detection for comp-off eligible sessions.
        late_arrival_info = None
        if not is_compoff_session and emp_code:
            late_arrival_info = attach_pending_late_arrival_to_attendance(
                emp_code,
                attendance_id,
                login_time
            )

            if late_arrival_info:
                response_data['late_arrival'] = late_arrival_info
                logger.info(
                    "Late arrival request already submitted before clock-in: %s - Exception ID: %s",
                    emp_email,
                    late_arrival_info['exception_id']
                )
            else:
                late_arrival_info = auto_detect_late_arrival(emp_code, attendance_id, login_time)
                
                if late_arrival_info:
                    response_data['late_arrival'] = late_arrival_info
                    logger.warning(f"🚨 Late arrival detected: {emp_email} - {late_arrival_info['late_by_minutes']} minutes")
        elif is_compoff_session:
            logger.info(f"✅ Late arrival check skipped for comp-off session: {emp_email}")
        
        message = "Clock in successful"
        if site_visit_info:
            message += ". Site field visit started automatically."
        if is_compoff_session:
            message = f"✨ Non-working day ({login_date.strftime('%A')}) - Eligible for comp-off"
            response_data['is_compoff_session'] = True
        elif late_arrival_info:
            if late_arrival_info.get('already_submitted'):
                message += (
                    f". You are {late_arrival_info['late_by_minutes']} minutes late. "
                    "Your late-arrival request has already been recorded."
                )
            else:
                message += f". You are {late_arrival_info['late_by_minutes']} minutes late."
        
        return ({
            "success": True,
            "message": message,
            "data": response_data
        }, 201)

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Clock in error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)

    finally:
        cursor.close()
        conn.close()


def clock_out(emp_email: str, lat: str, lon: str):
    """
    Clock out employee with early leave validation
    
    NEW: Validates if employee has approved early leave exception before allowing early clock-out
    NEW: Checks if employee was already auto clocked out
    """
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find active session
        cursor.execute("""
            SELECT * FROM attendance
            WHERE employee_email = %s AND logout_time IS NULL
            ORDER BY login_time DESC LIMIT 1
        """, (emp_email,))
        
        record = cursor.fetchone()
        
        if not record:
            return ({"success": False, "message": "No active session found"}, 404)
        
        attendance_id = record['id']
        logout_time = now_local_naive()
        login_time = record['login_time']
        
        if isinstance(login_time, str):
            login_time = datetime.strptime(login_time, '%Y-%m-%d %H:%M:%S')
        
        duration = logout_time - login_time
        hours = duration.total_seconds() / 3600
        work_date = record['date']
        
        # ✅ NEW: Check if already auto clocked out
        if record.get('auto_clocked_out'):
            logger.info(f"⚠️ Employee {emp_email} already auto clocked out at {record['logout_time']}")
            
            # Parse login coordinates
            login_coords = record.get('login_location', '').split(', ')
            login_lat = login_coords if len(login_coords) > 0 else ''
            login_lon = login_coords if len(login_coords) > 1 else ''
            
            # Parse logout coordinates
            logout_coords = record.get('logout_location', '').split(', ')
            logout_lat = logout_coords if len(logout_coords) > 0 else ''
            logout_lon = logout_coords if len(logout_coords) > 1 else ''
            
            return ({
                "success": False,
                "message": "Employee already auto clocked out at shift end time",
                "data": {
                    "attendance_id": attendance_id,
                    "attendance_type": record.get('attendance_type', 'office'),
                    "login_time": record['login_time'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(record['login_time'], datetime) else record['login_time'],
                    "logout_time": record['logout_time'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(record['logout_time'], datetime) else record['logout_time'],
                    "working_hours": float(record['working_hours'] or 0),
                    "auto_clocked_out": True,
                    "auto_clockout_reason": record.get('auto_clockout_reason', ''),
                    "login_location": {
                        "coordinates": record.get('login_location', ''),
                        "latitude": login_lat,
                        "longitude": login_lon,
                        "address": record.get('login_address', '')
                    },
                    "logout_location": {
                        "coordinates": record.get('logout_location', ''),
                        "latitude": logout_lat,
                        "longitude": logout_lon,
                        "address": record.get('logout_address', '')
                    }
                }
            }, 400)
        
        # ✅ Check for early leave validation
        # Get employee's shift end time
        cursor.execute("""
            SELECT 
                e.emp_code,
                e.emp_shift_id,
                s.shift_end_time
            FROM employees e
            LEFT JOIN shifts s ON s.shift_id = e.emp_shift_id
            WHERE e.emp_email = %s
        """, (emp_email,))
        
        emp_info = cursor.fetchone()
        
        if emp_info:
            emp_code = emp_info['emp_code']
            shift_end = emp_info['shift_end_time']
            
            # If no custom shift time, get from shift table
            if not shift_end and emp_info['emp_shift_id']:
                cursor.execute("""
                    SELECT shift_end_time FROM shifts 
                    WHERE shift_id = %s
                """, (emp_info['emp_shift_id'],))
                
                shift_result = cursor.fetchone()
                if shift_result:
                    shift_end = shift_result['shift_end_time']
            
            # Check if clocking out early
            if shift_end:
                current_time = logout_time.time()
                
                # Convert shift_end to time object if string
                if isinstance(shift_end, str):
                    shift_end = datetime.strptime(shift_end, '%H:%M:%S').time()
                
                # If clocking out before shift end time
                if current_time < shift_end:
                    logger.info(f"⚠️ Early clock-out detected for {emp_email}")

                    # If this attendance is a comp-off session, or the work day is a non-working day,
                    # allow early clock-out at any time
                    wd = work_date
                    if isinstance(wd, str):
                        try:
                            wd = datetime.strptime(wd, '%Y-%m-%d').date()
                        except Exception:
                            wd = work_date

                    is_working, day_type = is_working_day(wd, emp_code)
                    is_nonworking_day = not is_working
                    is_compoff_session = bool(record.get('is_compoff_session') or record.get('is_compoff'))

                    if is_nonworking_day:
                        logger.info(f"✅ Non-working day ({day_type}) - early clock-out allowed for {emp_email}")
                    elif is_compoff_session:
                        logger.info(f"✅ Comp-off session - early clock-out allowed for {emp_email}")
                    else:
                        # Check for early leave approval
                        is_approved, approval_message = check_early_leave_approval(
                            attendance_id,
                            current_time=current_time,
                            enforce_planned_time=False
                        )

                        if not is_approved:
                            return ({
                                "success": False,
                                "message": f"Early clock-out not allowed. {approval_message}",
                                "data": {
                                    "current_time": current_time.strftime('%H:%M'),
                                    "shift_end_time": shift_end.strftime('%H:%M'),
                                    "early_by_minutes": int((datetime.combine(datetime.today(), shift_end) - 
                                                       datetime.combine(datetime.today(), current_time)).total_seconds() / 60)
                                }
                            }, 403)

                        logger.info(f"✅ Early leave approved for {emp_email}")
        
        # 🧹 AUTO-CLEANUP: End all active activities
        cursor.execute("""
            UPDATE activities
            SET 
                end_time = %s,
                status = 'completed',
                duration_minutes = EXTRACT(EPOCH FROM (%s - start_time))/60
            WHERE 
                attendance_id = %s 
                AND status = 'active'
            RETURNING id, activity_type
        """, (logout_time, logout_time, attendance_id))
        
        ended_activities = cursor.fetchall()
        
        # 🧹 AUTO-CLEANUP: End all active field visits
        cursor.execute("""
            UPDATE field_visits
            SET 
                end_time = %s,
                status = 'completed',
                duration_minutes = EXTRACT(EPOCH FROM (%s - start_time))/60
            WHERE 
                attendance_id = %s 
                AND status = 'active'
            RETURNING id
        """, (logout_time, logout_time, attendance_id))
        
        ended_field_visits = cursor.fetchall()
        
        # Update attendance record
        cursor.execute("""
            UPDATE attendance
            SET 
                logout_time = %s, 
                logout_location = %s,
                logout_address = %s, 
                working_hours = %s, 
                status = %s
            WHERE id = %s
        """, (logout_time, location, address, round(hours, 2), 'logged_out', attendance_id))
        
        conn.commit()

        if emp_info and emp_code:
            try:
                notify_tracking_stopped(emp_code, attendance_id)
            except Exception as notification_error:
                logger.error(
                    "Non-critical tracking_stopped notification failure for %s attendance=%s: %s",
                    emp_code,
                    attendance_id,
                    notification_error,
                )

        # ✅ Calculate and record comp-off (if eligible)
        comp_off_result = None
        if emp_info:
            try:
                comp_off_result = calculate_and_record_compoff(
                    attendance_id=attendance_id,
                    emp_code=emp_code,
                    emp_email=emp_email,
                    emp_name=record['employee_name'],
                    work_date=work_date,
                    working_hours=round(hours, 2)
                )
            except Exception as e:
                logger.error(f"⚠️ Comp-off calculation failed (non-critical): {e}")
        
        logger.info(f"✅ Clock out successful: {emp_email}")
        logger.info(f"   - Ended {len(ended_activities)} activities")
        logger.info(f"   - Ended {len(ended_field_visits)} field visits")
        
        if comp_off_result:
            logger.info(f"   - Comp-off earned: {comp_off_result['comp_off_days']} days")
        
        # Parse login coordinates
        login_coords = record.get('login_location', '').split(', ')
        login_lat = login_coords if len(login_coords) > 0 else ''
        login_lon = login_coords if len(login_coords) > 1 else ''
        
        response_data = {
            "attendance_id": attendance_id,
            "attendance_type": record.get('attendance_type', 'office'),
            "login_time": record['login_time'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(record['login_time'], datetime) else record['login_time'],
            "logout_time": logout_time.strftime('%Y-%m-%d %H:%M:%S'),
            "working_hours": round(hours, 2),
            "login_location": {
                "coordinates": record.get('login_location', ''),
                "latitude": login_lat,
                "longitude": login_lon,
                "address": record.get('login_address', '')
            },
            "logout_location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            },
            "auto_cleanup": {
                "activities_ended": len(ended_activities),
                "field_visits_ended": len(ended_field_visits)
            }
        }
        
        # Include comp-off info in response
        if comp_off_result:
            response_data["comp_off"] = {
                "earned": True,
                "comp_off_days": comp_off_result['comp_off_days'],
                "extra_hours": comp_off_result['extra_hours'],
                "overtime_id": comp_off_result['overtime_id'],
                "expires_at": comp_off_result['expires_at'],
                "existing_overtime_records": comp_off_result.get('existing_overtime_records', 0),
                "eligible_records": comp_off_result.get('eligible_records', []),
                "message": f"You've earned {comp_off_result['comp_off_days']} day{'s' if comp_off_result['comp_off_days'] > 1 else ''} comp-off!"
            }
        else:
            response_data["comp_off"] = {
                "earned": False,
                "message": "No comp-off earned for this session"
            }
        
        return ({
            "success": True,
            "message": "Clock out successful. All active sessions ended.",
            "data": response_data
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Clock out error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# Other functions remain the same (get_attendance_status, get_attendance_history, get_day_summary)


def get_attendance_status(emp_email: str):
    """Get current attendance status with active sessions info"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM attendance
            WHERE employee_email = %s
            ORDER BY login_time DESC LIMIT 1
        """, (emp_email,))
        
        record = cursor.fetchone()
        
        if not record:
            return ({
                "success": True,
                "data": {
                    "is_logged_in": False,
                    "status": "not_logged_in",
                    "message": "No attendance records found"
                }
            }, 200)
        
        is_logged_in = record['logout_time'] is None
        attendance_id = record['id']
        
        # If logged in, get active activities and field visits
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
        
        # Parse coordinates
        login_coords = record.get('login_location', '').split(', ')
        login_lat = login_coords[0] if len(login_coords) > 0 else ''
        login_lon = login_coords[1] if len(login_coords) > 1 else ''
        
        logout_location = record.get('logout_location', '')
        logout_coords = logout_location.split(', ') if logout_location else ['', '']
        logout_lat = logout_coords[0] if len(logout_coords) > 0 else ''
        logout_lon = logout_coords[1] if len(logout_coords) > 1 else ''
        
        # Convert datetime objects
        for activity in active_activities:
            for key, value in activity.items():
                if isinstance(value, datetime):
                    activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        for visit in active_field_visits:
            for key, value in visit.items():
                if isinstance(value, datetime):
                    visit[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "attendance_id": attendance_id,
                "attendance_type": record.get('attendance_type', 'office'),
                "is_logged_in": is_logged_in,
                "status": record['status'],
                "login_time": str(record['login_time']),
                "logout_time": str(record['logout_time']) if record['logout_time'] else None,
                "working_hours": float(record['working_hours']) if record['working_hours'] else None,
                "login_location": {
                    "coordinates": record.get('login_location', ''),
                    "latitude": login_lat,
                    "longitude": login_lon,
                    "address": record.get('login_address', '')
                },
                "logout_location": {
                    "coordinates": logout_location,
                    "latitude": logout_lat,
                    "longitude": logout_lon,
                    "address": record.get('logout_address', '')
                } if logout_location else None,
                "active_sessions": {
                    "activities": active_activities,
                    "field_visits": active_field_visits,
                    "total_active": len(active_activities) + len(active_field_visits)
                }
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def get_attendance_history(emp_email: str, limit: int = 30):
    """Get attendance history with statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT emp_code
            FROM employees
            WHERE emp_email = %s
            LIMIT 1
        """, (emp_email,))
        employee = cursor.fetchone()
        shift_start = None
        shift_end = None

        if employee and employee.get('emp_code'):
            shift_start, shift_end = get_employee_shift_times(employee['emp_code'])

        cursor.execute("""
            SELECT * FROM attendance
            WHERE employee_email = %s
            ORDER BY login_time DESC LIMIT %s
        """, (emp_email, limit))
        
        records = cursor.fetchall()

        attendance_ids = [record['id'] for record in records]
        late_exceptions = _fetch_exception_rows_by_attendance_ids(
            cursor,
            attendance_ids,
            'late_arrival'
        )
        early_exceptions = _fetch_exception_rows_by_attendance_ids(
            cursor,
            attendance_ids,
            'early_leave'
        )

        late_arrivals_count = 0
        late_arrivals_informed_count = 0
        early_departures_count = 0
        early_leave_requested_count = 0

        def format_time_value(value):
            if not value:
                return None
            if isinstance(value, datetime):
                value = value.time()
            return value.strftime('%H:%M') if hasattr(value, 'strftime') else str(value)

        def format_datetime_value(value):
            if isinstance(value, datetime):
                return value.strftime('%Y-%m-%d %H:%M:%S')
            return value

        # Convert datetime and attach exception details
        for record in records:
            login_time_value = record.get('login_time')
            logout_time_value = record.get('logout_time')
            login_time_only = login_time_value.time() if isinstance(login_time_value, datetime) else None
            logout_time_only = logout_time_value.time() if isinstance(logout_time_value, datetime) else None
            is_compoff_session = bool(record.get('is_compoff_session') or record.get('is_compoff'))
            late_exception = late_exceptions.get(record['id'])
            early_exception = early_exceptions.get(record['id'])

            is_late_arrival = bool(
                not is_compoff_session and
                shift_start and
                login_time_only and
                login_time_only > shift_start
            )
            late_informed = bool(late_exception)
            is_early_departure = bool(
                not is_compoff_session and
                shift_end and
                logout_time_only and
                logout_time_only < shift_end
            )
            early_leave_requested = bool(early_exception)

            if is_late_arrival:
                late_arrivals_count += 1
            if late_informed:
                late_arrivals_informed_count += 1
            if is_early_departure:
                early_departures_count += 1
            if early_leave_requested:
                early_leave_requested_count += 1

            late_by_minutes = late_exception.get('late_by_minutes') if late_exception else None
            if late_by_minutes is None and is_late_arrival:
                late_by_minutes = int((
                    datetime.combine(datetime.today(), login_time_only) -
                    datetime.combine(datetime.today(), shift_start)
                ).total_seconds() / 60)

            early_by_minutes = early_exception.get('early_by_minutes') if early_exception else None
            if early_by_minutes is None and is_early_departure:
                early_by_minutes = int((
                    datetime.combine(datetime.today(), shift_end) -
                    datetime.combine(datetime.today(), logout_time_only)
                ).total_seconds() / 60)

            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            record['shift_start_time'] = format_time_value(shift_start)
            record['shift_end_time'] = format_time_value(shift_end)
            if is_compoff_session:
                record['late_arrival'] = None
                record['early_leave'] = None
            else:
                record['late_arrival'] = {
                    "is_late": is_late_arrival,
                    "informed": late_informed,
                    "status": late_exception.get('status') if late_exception else ('not_informed' if is_late_arrival else None),
                    "planned_arrival_time": format_time_value(
                        late_exception.get('planned_arrival_time') if late_exception else shift_start
                    ) if (is_late_arrival or late_informed) else None,
                    "actual_login_time": format_time_value(login_time_only),
                    "late_by_minutes": late_by_minutes,
                    "reason": late_exception.get('reason') if late_exception else None,
                    "requested_at": format_datetime_value(late_exception.get('requested_at')) if late_exception else None,
                    "reviewed_at": format_datetime_value(late_exception.get('reviewed_at')) if late_exception else None,
                }
                record['early_leave'] = {
                    "is_early_departure": is_early_departure,
                    "requested": early_leave_requested,
                    "status": early_exception.get('status') if early_exception else ('not_requested' if is_early_departure else None),
                    "planned_leave_time": format_time_value(early_exception.get('planned_leave_time')) if early_exception else None,
                    "actual_logout_time": format_time_value(logout_time_only),
                    "early_by_minutes": early_by_minutes,
                    "reason": early_exception.get('reason') if early_exception else None,
                    "requested_at": format_datetime_value(early_exception.get('requested_at')) if early_exception else None,
                    "reviewed_at": format_datetime_value(early_exception.get('reviewed_at')) if early_exception else None,
                }

            # Parse login coordinates
            login_coords = record.get('login_location', '').split(', ')
            record['login_lat'] = login_coords[0] if len(login_coords) > 0 else ''
            record['login_lon'] = login_coords[1] if len(login_coords) > 1 else ''
            
            # Parse logout coordinates
            logout_location = record.get('logout_location', '')
            if logout_location:
                logout_coords = logout_location.split(', ')
                record['logout_lat'] = logout_coords[0] if len(logout_coords) > 0 else ''
                record['logout_lon'] = logout_coords[1] if len(logout_coords) > 1 else ''
        
        # Calculate statistics
        total_hours = sum([float(r['working_hours'] or 0) for r in records])
        completed_days = len([r for r in records if r['status'] == 'logged_out'])
        
        return ({
            "success": True,
            "data": {
                "records": records,
                "statistics": {
                    "total_days": len(records),
                    "completed_days": completed_days,
                    "late_arrivals": late_arrivals_count,
                    "late_arrivals_informed": late_arrivals_informed_count,
                    "early_departures": early_departures_count,
                    "early_leave_requested": early_leave_requested_count,
                    "total_hours": round(total_hours, 2),
                    "average_hours": round(total_hours / len(records), 2) if records else 0
                }
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def get_day_summary(emp_email: str, target_date: date = None):
    """Get complete day summary"""
    if not target_date:
        target_date = date.today()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM attendance
            WHERE employee_email = %s AND date = %s
        """, (emp_email, target_date))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({
                "success": True,
                "data": {
                    "date": str(target_date),
                    "attendance": None,
                    "activities": [],
                    "field_visits": [],
                    "message": "No attendance record for this date"
                }
            }, 200)
        
        attendance_id = attendance['id']
        
        cursor.execute("""
            SELECT * FROM activities
            WHERE attendance_id = %s
            ORDER BY start_time DESC
        """, (attendance_id,))
        
        activities = cursor.fetchall()
        
        cursor.execute("""
            SELECT * FROM field_visits
            WHERE attendance_id = %s
            ORDER BY start_time DESC
        """, (attendance_id,))
        
        field_visits = cursor.fetchall()
        
        # Convert datetime objects
        for key, value in attendance.items():
            if isinstance(value, datetime):
                attendance[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        for activity in activities:
            for key, value in activity.items():
                if isinstance(value, datetime):
                    activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        for visit in field_visits:
            for key, value in visit.items():
                if isinstance(value, datetime):
                    visit[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        total_activities = len(activities)
        total_field_visits = len(field_visits)
        total_distance = sum([float(fv.get('total_distance_km') or 0) for fv in field_visits])
        
        return ({
            "success": True,
            "data": {
                "date": str(target_date),
                "attendance": attendance,
                "activities": activities,
                "field_visits": field_visits,
                "summary": {
                    "total_activities": total_activities,
                    "total_field_visits": total_field_visits,
                    "total_distance_km": round(total_distance, 2),
                    "working_hours": float(attendance.get('working_hours') or 0)
                }
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()

def get_attendance_by_id(attendance_id: int):
    """
    Get a specific attendance record by ID
    """
    if not attendance_id or attendance_id <= 0:
        return {"success": False, "message": "Invalid attendance ID"}, 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM attendance
            WHERE id = %s
        """, (attendance_id,))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return {"success": False, "message": "Attendance record not found"}, 404
        
        # Convert datetime objects to strings
        for key, value in attendance.items():
            if isinstance(value, datetime):
                attendance[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "success": True,
            "data": attendance
        }, 200
    
    except Exception as e:
        logger.exception("Error fetching attendance by ID: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        cursor.close()
        conn.close()


def update_attendance(
    attendance_id: int,
    login_time: str = None,
    logout_time: str = None,
    login_address: str = None,
    logout_address: str = None,
    attendance_type: str = None,
    updated_by: str = None
):
    """
    Update an attendance record
    
    Parameters:
        attendance_id: ID of attendance record to update
        login_time: Clock-in time (YYYY-MM-DD HH:MM:SS format)
        logout_time: Clock-out time (YYYY-MM-DD HH:MM:SS format)
        login_address: Clock-in address
        logout_address: Clock-out address
        attendance_type: 'office' or 'site'
        updated_by: Employee code of who is updating (for audit)
    """
    if not attendance_id or attendance_id <= 0:
        return {"success": False, "message": "Invalid attendance ID"}, 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.autocommit = False  # Start transaction
        
        # Check if attendance exists
        cursor.execute("SELECT * FROM attendance WHERE id = %s", (attendance_id,))
        attendance = cursor.fetchone()
        
        if not attendance:
            conn.rollback()
            return {"success": False, "message": "Attendance record not found"}, 404
        
        emp_email = attendance['employee_email']
        
        # Prepare update fields
        update_fields = []
        update_values = []
        
        if login_time:
            try:
                login_dt = datetime.strptime(login_time, "%Y-%m-%d %H:%M:%S")
                update_fields.append("login_time = %s")
                update_values.append(login_dt)
            except ValueError:
                conn.rollback()
                return {"success": False, "message": "Invalid login_time format. Use YYYY-MM-DD HH:MM:SS"}, 400
        
        if logout_time:
            try:
                logout_dt = datetime.strptime(logout_time, "%Y-%m-%d %H:%M:%S")
                update_fields.append("logout_time = %s")
                update_values.append(logout_dt)
            except ValueError:
                conn.rollback()
                return {"success": False, "message": "Invalid logout_time format. Use YYYY-MM-DD HH:MM:SS"}, 400
        
        if login_address:
            update_fields.append("login_address = %s")
            update_values.append(login_address)
        
        if logout_address:
            update_fields.append("logout_address = %s")
            update_values.append(logout_address)
        
        if attendance_type:
            try:
                normalized_type = _normalize_attendance_type(attendance_type)
                update_fields.append("attendance_type = %s")
                update_values.append(normalized_type)
            except ValueError:
                conn.rollback()
                return {"success": False, "message": "Invalid attendance_type. Must be 'office' or 'site'"}, 400
        
        if not update_fields:
            conn.rollback()
            return {"success": False, "message": "No fields to update"}, 400
        
        # Recalculate working hours if both clock times are updated
        if login_time and logout_time:
            try:
                login_dt = datetime.strptime(login_time, "%Y-%m-%d %H:%M:%S")
                logout_dt = datetime.strptime(logout_time, "%Y-%m-%d %H:%M:%S")
                
                if logout_dt <= login_dt:
                    conn.rollback()
                    return {"success": False, "message": "Clock-out time must be after clock-in time"}, 400
                
                working_seconds = (logout_dt - login_dt).total_seconds()
                working_hours = round(working_seconds / 3600, 2)
                
                update_fields.append("working_hours = %s")
                update_values.append(working_hours)
            except ValueError as e:
                conn.rollback()
                return {"success": False, "message": f"Invalid time format: {str(e)}"}, 400
        elif login_time or logout_time:
            # If only one time is updated, try to recalculate from the existing other time
            existing_login = attendance.get('login_time')
            existing_logout = attendance.get('logout_time')
            
            if login_time:
                login_dt = datetime.strptime(login_time, "%Y-%m-%d %H:%M:%S")
                if existing_logout and isinstance(existing_logout, datetime):
                    if existing_logout <= login_dt:
                        conn.rollback()
                        return {"success": False, "message": "Clock-in time must be before clock-out time"}, 400
                    working_seconds = (existing_logout - login_dt).total_seconds()
                    working_hours = round(working_seconds / 3600, 2)
                    update_fields.append("working_hours = %s")
                    update_values.append(working_hours)
            
            if logout_time:
                logout_dt = datetime.strptime(logout_time, "%Y-%m-%d %H:%M:%S")
                if existing_login and isinstance(existing_login, datetime):
                    if logout_dt <= existing_login:
                        conn.rollback()
                        return {"success": False, "message": "Clock-out time must be after clock-in time"}, 400
                    working_seconds = (logout_dt - existing_login).total_seconds()
                    working_hours = round(working_seconds / 3600, 2)
                    update_fields.append("working_hours = %s")
                    update_values.append(working_hours)
        
        # Execute update
        update_values.append(attendance_id)
        query = f"""
            UPDATE attendance 
            SET {', '.join(update_fields)}
            WHERE id = %s
        """
        
        cursor.execute(query, update_values)
        
        conn.commit()
        
        # Get updated record
        cursor.execute("SELECT * FROM attendance WHERE id = %s", (attendance_id,))
        updated = cursor.fetchone()
        
        # Convert datetime objects to strings
        for key, value in updated.items():
            if isinstance(value, datetime):
                updated[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "success": True,
            "message": "Attendance record updated successfully",
            "data": updated
        }, 200
    
    except Exception as e:
        conn.rollback()
        logger.exception("Error updating attendance: %s", e)
        return {"success": False, "message": "Internal server error"}, 500
    finally:
        conn.autocommit = True
        cursor.close()
        conn.close()