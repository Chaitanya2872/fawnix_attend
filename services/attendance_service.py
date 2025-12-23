"""
Attendance Service
Enhanced with coordinate tracking in responses
"""

from datetime import datetime, timedelta, date
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
import logging

logger = logging.getLogger(__name__)


def clock_in(emp_email: str, emp_name: str, phone: str, lat: str, lon: str):
    """Clock in employee with coordinates in response"""
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
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
        
        return ({
            "success": True,
            "message": "Clock in successful",
            "data": {
                "attendance_id": attendance_id,
                "login_time": login_time.strftime('%Y-%m-%d %H:%M:%S'),
                "login_location": {
                    "coordinates": location,
                    "latitude": lat,
                    "longitude": lon,
                    "address": address
                }
            }
        }, 201)
    except Exception as e:
        conn.rollback()
        logger.error(f"Clock in error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def clock_out(emp_email: str, lat: str, lon: str):
    """Clock out employee with coordinates and comp-off calculation"""
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
            return ({"success": False, "message": "No active session"}, 404)
        
        logout_time = datetime.now()
        login_time = record['login_time']
        
        if isinstance(login_time, str):
            login_time = datetime.strptime(login_time, '%Y-%m-%d %H:%M:%S')
        
        duration = logout_time - login_time
        hours = duration.total_seconds() / 3600
        
        cursor.execute("""
            UPDATE attendance
            SET logout_time = %s, logout_location = %s,
                logout_address = %s, working_hours = %s, status = %s
            WHERE id = %s
        """, (logout_time, location, address, round(hours, 2), 'logged_out', record['id']))
        
        conn.commit()
        
        # Get employee code for comp-off calculation
        cursor.execute("""
            SELECT emp_code FROM employees WHERE emp_email = %s
        """, (emp_email,))
        
        emp_result = cursor.fetchone()
        
        # Extract login coordinates
        login_coords = record.get('login_location', '').split(', ')
        login_lat = login_coords[0] if len(login_coords) > 0 else ''
        login_lon = login_coords[1] if len(login_coords) > 1 else ''
        
        response_data = {
            "attendance_id": record['id'],
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
            }
        }
        
        # Calculate comp-off if employee found
        if emp_result:
            from services.attendance_service import calculate_comp_off
            emp_code = emp_result['emp_code']
            work_date = record['date']
            
            comp_off_result = calculate_comp_off(emp_code, work_date, round(hours, 2))
            
            # Add comp-off info to response
            if comp_off_result.get('comp_off_earned', 0) > 0:
                response_data['comp_off'] = comp_off_result
                logger.info(f"Comp-off earned: {comp_off_result}")
            else:
                logger.info(f"No comp-off: {comp_off_result.get('message', 'Unknown')}")
        
        return ({
            "success": True,
            "message": "Clock out successful",
            "data": response_data
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Clock out error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_attendance_status(emp_email: str):
    """Get attendance status with coordinates"""
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
                "data": {"is_logged_in": False, "status": "not_logged_in"}
            }, 200)
        
        # Parse login coordinates
        login_coords = record.get('login_location', '').split(', ')
        login_lat = login_coords[0] if len(login_coords) > 0 else ''
        login_lon = login_coords[1] if len(login_coords) > 1 else ''
        
        # Parse logout coordinates
        logout_location = record.get('logout_location', '')
        logout_coords = logout_location.split(', ') if logout_location else ['', '']
        logout_lat = logout_coords[0] if len(logout_coords) > 0 else ''
        logout_lon = logout_coords[1] if len(logout_coords) > 1 else ''
        
        return ({
            "success": True,
            "data": {
                "is_logged_in": record['logout_time'] is None,
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
                } if logout_location else None
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def get_attendance_history(emp_email: str, limit: int = 30):
    """Get attendance history with coordinates"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM attendance
            WHERE employee_email = %s
            ORDER BY login_time DESC LIMIT %s
        """, (emp_email, limit))
        
        records = cursor.fetchall()
        
        # Convert datetime to string and add coordinate breakdown
        for record in records:
            for key, value in record.items():
                if isinstance(value, datetime):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            # Add parsed coordinates
            login_coords = record.get('login_location', '').split(', ')
            record['login_lat'] = login_coords[0] if len(login_coords) > 0 else ''
            record['login_lon'] = login_coords[1] if len(login_coords) > 1 else ''
            
            logout_location = record.get('logout_location', '')
            if logout_location:
                logout_coords = logout_location.split(', ')
                record['logout_lat'] = logout_coords[0] if len(logout_coords) > 0 else ''
                record['logout_lon'] = logout_coords[1] if len(logout_coords) > 1 else ''
        
        total_hours = sum([float(r['working_hours'] or 0) for r in records])
        
        return ({
            "success": True,
            "data": {
                "records": records,
                "total_days": len(records),
                "total_hours": round(total_hours, 2)
            }
        }, 200)
    finally:
        cursor.close()
        conn.close()


def calculate_comp_off(emp_code: str, work_date: date, working_hours: float) -> dict:
    """Calculate comp-off based on working hours"""
    comp_off_earned = 0
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Count today's clock-ins
        cursor.execute("""
            SELECT COUNT(*) as count FROM attendance
            WHERE employee_email = (SELECT emp_email FROM employees WHERE emp_code = %s)
            AND DATE(login_time) = %s
        """, (emp_code, work_date))
        
        result = cursor.fetchone()
        clock_in_count = result['count'] if result else 0
        
        logger.info(f"Comp-off check: emp_code={emp_code}, date={work_date}, clock_in_count={clock_in_count}, hours={working_hours}")
        
        # Only calculate comp-off from 2nd clock-in onwards
        if clock_in_count < 2:
            return {
                "comp_off_earned": 0, 
                "message": "No comp-off for first clock-in of the day"
            }
        
        # Calculate comp-off based on hours
        if working_hours >= 6:
            comp_off_earned = 1.0
        elif working_hours >= 3:
            comp_off_earned = 0.5
        else:
            return {
                "comp_off_earned": 0,
                "message": f"Insufficient working hours ({working_hours}h). Minimum 3 hours required."
            }
        
        # Check monthly comp-off count
        current_month_start = work_date.replace(day=1)
        if work_date.month == 12:
            next_month_start = date(work_date.year + 1, 1, 1)
        else:
            next_month_start = work_date.replace(month=work_date.month + 1, day=1)
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM comp_offs
            WHERE emp_code = %s
            AND work_date >= %s AND work_date < %s
            AND status IN ('pending', 'validated', 'approved')
        """, (emp_code, current_month_start, next_month_start))
        
        result = cursor.fetchone()
        monthly_count = result['count'] if result else 0
        
        # If >3 requests this month, needs HR/CMD validation
        needs_validation = monthly_count >= 3
        
        # Get employee details
        cursor.execute("""
            SELECT emp_full_name, emp_email FROM employees WHERE emp_code = %s
        """, (emp_code,))
        
        employee = cursor.fetchone()
        
        if not employee:
            logger.error(f"Employee not found: {emp_code}")
            return {"comp_off_earned": 0, "error": "Employee not found"}
        
        # Insert comp-off record
        cursor.execute("""
            INSERT INTO comp_offs (
                emp_code, emp_name, emp_email,
                work_date, clock_in_time, clock_out_time,
                working_hours, comp_off_earned, comp_off_balance,
                status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_code, 
            employee['emp_full_name'], 
            employee['emp_email'],
            work_date, 
            datetime.now(), 
            datetime.now(),
            working_hours, 
            comp_off_earned, 
            comp_off_earned,
            'pending' if needs_validation else 'validated',
            f'Requires HR/CMD validation (>3 requests)' if needs_validation else 'Auto-validated'
        ))
        
        comp_off_id = cursor.fetchone()['id']
        conn.commit()
        
        logger.info(f"Comp-off created: id={comp_off_id}, earned={comp_off_earned}, needs_validation={needs_validation}")
        
        return {
            "comp_off_earned": comp_off_earned,
            "comp_off_id": comp_off_id,
            "needs_validation": needs_validation,
            "monthly_count": monthly_count + 1,
            "message": f"{comp_off_earned} day comp-off earned" +
                      (" - Requires HR/CMD validation" if needs_validation else " - Auto-validated")
        }
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Comp-off calculation error: {e}")
        return {"comp_off_earned": 0, "error": str(e)}
    finally:
        cursor.close()
        conn.close()