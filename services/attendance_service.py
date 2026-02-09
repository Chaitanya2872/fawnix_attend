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
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
from services.CompLeaveService import calculate_and_record_compoff, is_working_day
from services.attendance_exceptions_service import (
    auto_detect_late_arrival,
    check_early_leave_approval
)
import logging

logger = logging.getLogger(__name__)


def clock_in(emp_email: str, emp_name: str, phone: str, lat: str, lon: str):
    """
    Clock in employee with late arrival auto-detection
    
    NEW: Automatically detects if employee is late and returns detection info
    """
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
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
        login_time = datetime.now()
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
                date, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_email, emp_name, phone,
            login_time, location, address,
            login_time.date(), 'logged_in'
        ))
        
        attendance_id = cursor.fetchone()['id']
        
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
        
        conn.commit()
        
        logger.info(f"✅ Clock in successful: {emp_email} - Attendance ID: {attendance_id}")
        
        response_data = {
            "attendance_id": attendance_id,
            "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
            "location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            }
        }
        
        # ✅ Skip late arrival detection for comp-off eligible sessions (non-working days)
        late_arrival_info = None
        if not is_compoff_session and emp_code:
            late_arrival_info = auto_detect_late_arrival(emp_code, attendance_id, login_time)
            
            if late_arrival_info:
                response_data['late_arrival'] = late_arrival_info
                logger.warning(f"🚨 Late arrival detected: {emp_email} - {late_arrival_info['late_by_minutes']} minutes")
        elif is_compoff_session:
            logger.info(f"✅ Late arrival check skipped for non-working day: {emp_email}")
        
        message = "Clock in successful"
        if is_compoff_session:
            message = f"✨ Non-working day ({login_date.strftime('%A')}) - Eligible for comp-off"
            response_data['is_compoff_session'] = True
        elif late_arrival_info:
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
        logout_time = datetime.now()
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
            SELECT * FROM attendance
            WHERE employee_email = %s
            ORDER BY login_time DESC LIMIT %s
        """, (emp_email, limit))
        
        records = cursor.fetchall()
        
        # Convert datetime and parse coordinates
        for record in records:
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
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
