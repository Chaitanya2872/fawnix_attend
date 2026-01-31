# services/auto_clockout_service.py
"""
Auto Clock-out Service
Automatically clocks out employees at shift end time
Includes activity/field visit cleanup and comp-off calculation
"""

from datetime import datetime, time, date
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
from services.CompLeaveService import calculate_and_record_compoff
import logging

logger = logging.getLogger(__name__)

# ==========================================
# ✅ FIXED: Configuration
# ==========================================
WEEKDAY_CLOCKOUT_TIME = time(18, 30, 0)  # 6:30 PM (Mon-Fri)
SATURDAY_HALFDAY_CLOCKOUT_TIME = time(13, 0, 0)  # 1:00 PM (Saturday half-days)
AUTO_CLOCKOUT_LOCATION = "Auto Clock-Out Location"  # Default location

# Saturday half-day configuration
# 1st, 3rd, 5th Saturday are half days
SATURDAY_HALFDAY_WEEKENDS = [1, 3, 5]  # 1st, 3rd, 5th occurrence


def is_saturday_halfday(check_date: date) -> bool:
    """
    Check if given date is a Saturday half-day (1st, 3rd, or 5th Saturday of month)
    
    Returns True if date is 1st, 3rd, or 5th Saturday
    """
    if check_date.weekday() != 5:  # 5 = Saturday
        return False
    
    # Get the day of month
    day_of_month = check_date.day
    
    # Calculate which Saturday of the month this is
    # Saturdays fall on: 1-7, 8-14, 15-21, 22-28, 29-31
    saturday_occurrence = (day_of_month - 1) // 7 + 1
    
    return saturday_occurrence in SATURDAY_HALFDAY_WEEKENDS


def get_auto_clockout_time(check_date: date) -> time:
    """
    Get the appropriate auto-clockout time based on day of week
    
    Returns:
        time object: 6:30 PM for weekdays, 1:00 PM for Saturday half-days
    """
    if is_saturday_halfday(check_date):
        logger.info(f"📅 {check_date.strftime('%A, %B %d')} is Saturday half-day - Using {SATURDAY_HALFDAY_CLOCKOUT_TIME.strftime('%H:%M')} auto-clockout")
        return SATURDAY_HALFDAY_CLOCKOUT_TIME
    else:
        return WEEKDAY_CLOCKOUT_TIME

def auto_clockout_all_active_sessions():
    """
    Scheduled job that auto clocks out all employees who are still logged in after configured time
    
    Features:
    - Auto-closes all active activities
    - Auto-closes all active field visits
    - Calculates working hours
    - Calculates comp-off eligibility
    - Marks records with auto_clocked_out flag
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        current_time = datetime.now()
        current_date = current_time.date()
        
        # ✅ Get the appropriate auto-clockout time for this date
        auto_clockout_time = get_auto_clockout_time(current_date)
        
        logger.info(f"⏰ Auto clock-out job running at {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"⏰ Today: {current_date.strftime('%A, %B %d, %Y')}")
        logger.info(f"⏰ Configured auto-clockout time: {auto_clockout_time.strftime('%H:%M:%S')}")
        logger.info(f"⏰ Current time: {current_time.time().strftime('%H:%M:%S')}")
        
        # Only run if current time is past configured auto_clockout_time
        if current_time.time() < auto_clockout_time:
            logger.info(f"⏰ Auto clock-out skipped - current time {current_time.time().strftime('%H:%M:%S')} is before {auto_clockout_time.strftime('%H:%M:%S')}")
            return {
                "success": False,
                "message": f"Auto clock-out only runs after {auto_clockout_time.strftime('%H:%M:%S')}",
                "auto_clocked_out": 0
            }
        
        # Find all active sessions for today
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
              AND a.date = %s
        """, (current_date,))
        
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
        
        for session in active_sessions:
            try:
                attendance_id = session['attendance_id']
                emp_email = session['employee_email']
                emp_name = session['employee_name']
                emp_code = session['emp_code']
                login_time = session['login_time']
                work_date = session['date']
                
                logger.info(f"🔄 Processing auto clock-out for {emp_email} (attendance_id: {attendance_id})")
                
                # Set logout time to configured auto_clockout_time
                logout_datetime = datetime.combine(current_date, auto_clockout_time)
                
                # Use login location for logout (same as login)
                logout_location = session.get('login_location', '')
                
                # ✅ FIXED: Parse coordinates correctly
                coords = logout_location.split(', ') if logout_location else ['', '']
                lat = coords[0] if len(coords) > 0 else ''
                lon = coords[1] if len(coords) > 1 else ''
                
                logout_address = get_address_from_coordinates(lat, lon) if lat and lon else AUTO_CLOCKOUT_LOCATION
                
                # Calculate working hours
                duration = logout_datetime - login_time
                working_hours = duration.total_seconds() / 3600
                
                logger.info(f"  📍 Logout location: {logout_location}")
                logger.info(f"  ⏱️  Working hours: {working_hours:.2f}h")
                
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
                """, (logout_datetime, logout_datetime, attendance_id))
                
                activities_closed = cursor.rowcount
                logger.info(f"  🧹 Closed {activities_closed} active activities")
                
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
                """, (logout_datetime, logout_datetime, attendance_id))
                
                field_visits_closed = cursor.rowcount
                logger.info(f"  🧹 Closed {field_visits_closed} active field visits")
                
                # Update attendance record with auto clock-out flag
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
                    f'Auto clocked-out at {auto_clockout_time.strftime("%H:%M:%S")}',
                    attendance_id
                ))
                
                # ✅ Calculate comp-off if eligible
                comp_off_result = None
                if emp_code:
                    try:
                        comp_off_result = calculate_and_record_compoff(
                            attendance_id=attendance_id,
                            emp_code=emp_code,
                            emp_email=emp_email,
                            emp_name=emp_name,
                            work_date=work_date,
                            working_hours=round(working_hours, 2)
                        )
                        logger.info(f"  💰 Comp-off calculated: {comp_off_result.get('comp_off_days', 0)} days")
                    except Exception as e:
                        logger.error(f"  ⚠️ Comp-off calculation failed for {emp_email}: {e}")
                
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
                
                logger.info(f"✅ Auto clocked-out: {emp_email} - {working_hours:.2f}h (Activities: {activities_closed}, Field Visits: {field_visits_closed})")
                
            except Exception as e:
                logger.error(f"❌ Error auto clocking-out {session.get('employee_email')}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        conn.commit()
        
        logger.info(f"✅ Auto clock-out completed: {len(auto_clocked_out)} employees processed")
        
        return {
            "success": True,
            "message": f"Successfully auto clocked-out {len(auto_clocked_out)} employees",
            "auto_clocked_out": len(auto_clocked_out),
            "details": auto_clocked_out,
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
        conn.close()


def manual_trigger_auto_clockout():
    """
    Manual trigger for testing auto clockout (bypasses time check)
    Use this for testing purposes only
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        current_time = datetime.now()
        current_date = current_time.date()
        
        logger.info(f"🧪 MANUAL AUTO CLOCK-OUT TRIGGERED at {current_time}")
        
        # Find all active sessions for today (no time check)
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
              AND a.date = %s
        """, (current_date,))
        
        active_sessions = cursor.fetchall()
        
        if not active_sessions:
            logger.info("✅ No active sessions to auto clock-out")
            return {
                "success": True,
                "message": "No active sessions found",
                "auto_clocked_out": 0
            }
        
        auto_clocked_out = []
        
        for session in active_sessions:
            try:
                attendance_id = session['attendance_id']
                emp_email = session['employee_email']
                emp_name = session['employee_name']
                emp_code = session['emp_code']
                login_time = session['login_time']
                work_date = session['date']
                
                # Use current time for logout
                logout_datetime = current_time
                
                # Use login location for logout
                logout_location = session.get('login_location', '')
                
                coords = logout_location.split(', ') if logout_location else ['', '']
                lat = coords[0] if len(coords) > 0 else ''
                lon = coords[1] if len(coords) > 1 else ''
                
                logout_address = get_address_from_coordinates(lat, lon) if lat and lon else AUTO_CLOCKOUT_LOCATION
                
                # Calculate working hours
                duration = logout_datetime - login_time
                working_hours = duration.total_seconds() / 3600
                
                # End all active activities
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
                
                # End all active field visits
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
                            working_hours=round(working_hours, 2)
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
                
                logger.info(f"✅ Manual auto clocked-out: {emp_email} - {working_hours:.2f}h")
                
            except Exception as e:
                logger.error(f"❌ Error in manual auto clock-out for {session.get('employee_email')}: {e}")
                continue
        
        conn.commit()
        
        logger.info(f"✅ Manual auto clock-out completed: {len(auto_clocked_out)} employees")
        
        return {
            "success": True,
            "message": f"Manual auto clock-out successful: {len(auto_clocked_out)} employees",
            "auto_clocked_out": len(auto_clocked_out),
            "details": auto_clocked_out,
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
        conn.close()