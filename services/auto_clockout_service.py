# services/auto_clockout_service.py
"""
Auto Clock-out Service
Automatically clocks out employees at shift end time (6:30 PM)
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
AUTO_CLOCKOUT_TIME = time(0, 25, 0)  # 6:30 PM (PRODUCTION)
AUTO_CLOCKOUT_LOCATION = "Auto Clock-Out Location"  # Default location

def auto_clockout_all_active_sessions():
    """
    Scheduled job that auto clocks out all employees who are still logged in after 6:30 PM
    
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
        
        # Only run if current time is past 6:30 PM
        if current_time.time() < AUTO_CLOCKOUT_TIME:
            logger.info(f"⏰ Auto clock-out skipped - current time {current_time.time()} is before {AUTO_CLOCKOUT_TIME}")
            return {
                "success": False,
                "message": "Auto clock-out only runs after 6:30 PM",
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
              AND a.login_time::time < %s
        """, (current_date, AUTO_CLOCKOUT_TIME))
        
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
                
                # Set logout time to 6:30 PM
                logout_datetime = datetime.combine(current_date, AUTO_CLOCKOUT_TIME)
                
                # Use login location for logout (same as login)
                logout_location = session.get('login_location', '')
                
                # ✅ FIXED: Parse coordinates correctly
                coords = logout_location.split(', ') if logout_location else ['', '']
                lat = coords[0] if len(coords) > 0 else ''  # ✅ Fixed: was just 'coords'
                lon = coords[1] if len(coords) > 1 else ''  # ✅ Fixed: was just 'coords'
                
                logout_address = get_address_from_coordinates(lat, lon) if lat and lon else AUTO_CLOCKOUT_LOCATION
                
                # Calculate working hours
                duration = logout_datetime - login_time
                working_hours = duration.total_seconds() / 3600
                
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
                    'Auto clocked-out at shift end time (6:30 PM)',
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