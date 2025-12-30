"""
Enhanced Attendance Service
Version 2.0 - With field visit integration and auto-cleanup
"""

from datetime import datetime, timedelta, date
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
import logging

logger = logging.getLogger(__name__)


def clock_in(emp_email: str, emp_name: str, phone: str, lat: str, lon: str):
    """Clock in employee with session guard"""
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

        # ✅ Normal clock-in flow
        login_time = datetime.now()
        
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
        conn.commit()
        
        logger.info(f"✅ Clock in successful: {emp_email} - Attendance ID: {attendance_id}")
        
        return ({
            "success": True,
            "message": "Clock in successful",
            "data": {
                "attendance_id": attendance_id,
                "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
                "location": {
                    "coordinates": location,
                    "latitude": lat,
                    "longitude": lon,
                    "address": address
                }
            }
        }, 201)

    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Clock in error: {e}")
        return ({"success": False, "message": str(e)}, 500)

    finally:
        cursor.close()
        conn.close()


def clock_out(emp_email: str, lat: str, lon: str):
    """Clock out employee with auto-cleanup"""
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
        
        logger.info(f"✅ Clock out successful: {emp_email}")
        logger.info(f"   - Ended {len(ended_activities)} activities")
        logger.info(f"   - Ended {len(ended_field_visits)} field visits")
        
        # Parse login coordinates
        login_coords = record.get('login_location', '').split(', ')
        login_lat = login_coords[0] if len(login_coords) > 0 else ''
        login_lon = login_coords[1] if len(login_coords) > 1 else ''
        
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
        
        return ({
            "success": True,
            "message": "Clock out successful. All active sessions ended.",
            "data": response_data
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Clock out error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


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