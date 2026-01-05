"""
Distance Monitoring Service
Monitor user location relative to clock-in location ONLY:
1. On working days (not holidays/weekends)
2. When user is moving (speed > threshold)
3. Alert if distance > 1km from clock-in location
"""

from datetime import datetime, date
from database.connection import get_db_connection
from math import radians, sin, cos, sqrt, atan2
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Configuration
DISTANCE_THRESHOLD_KM = 1.0  # Alert if >1km from clock-in
MOVEMENT_THRESHOLD_KMH = 5.0  # Consider moving if speed > 5 km/h
STATIONARY_RADIUS_METERS = 50  # If within 50m, consider stationary


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS points in kilometers using Haversine formula
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def is_working_day(check_date: date) -> Tuple[bool, str]:
    """
    Check if given date is a working day
    
    Returns:
        (is_working, reason)
        - is_working: True if working day, False otherwise
        - reason: Reason if not working day
    
    Non-working days:
    1. Sundays (always)
    2. 2nd and 4th Saturdays
    3. Organization holidays
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if Sunday
        if check_date.weekday() == 6:  # Sunday
            return (False, "Sunday")
        
        # Check if 2nd or 4th Saturday
        if check_date.weekday() == 5:  # Saturday
            week_of_month = (check_date.day - 1) // 7 + 1
            if week_of_month in [2, 4]:
                return (False, f"2nd/4th Saturday")
        
        # Check organization holidays
        cursor.execute("""
            SELECT holiday_name FROM organization_holidays
            WHERE holiday_date = %s
        """, (check_date,))
        
        holiday = cursor.fetchone()
        if holiday:
            return (False, f"Holiday: {holiday['holiday_name']}")
        
        return (True, "Working day")
        
    except Exception as e:
        logger.error(f"Error checking working day: {e}")
        return (True, "Assumed working day")  # Default to working day if check fails
    finally:
        cursor.close()
        conn.close()


def is_user_moving(speed_kmh: Optional[float], last_lat: Optional[str], last_lon: Optional[str], 
                   current_lat: str, current_lon: str) -> Tuple[bool, str]:
    """
    Determine if user is moving based on:
    1. Speed (if available)
    2. Distance from last known location
    
    Returns:
        (is_moving, reason)
    """
    # Method 1: Check speed if available
    if speed_kmh is not None and speed_kmh > MOVEMENT_THRESHOLD_KMH:
        return (True, f"Speed: {speed_kmh:.1f} km/h")
    
    # Method 2: Check distance from last location
    if last_lat and last_lon:
        try:
            distance_m = haversine_distance(
                float(last_lat), float(last_lon),
                float(current_lat), float(current_lon)
            ) * 1000  # Convert to meters
            
            if distance_m > STATIONARY_RADIUS_METERS:
                return (True, f"Moved {distance_m:.0f}m from last location")
            else:
                return (False, f"Stationary (moved only {distance_m:.0f}m)")
        except Exception as e:
            logger.error(f"Error calculating movement: {e}")
    
    # Method 3: If speed is low, consider stationary
    if speed_kmh is not None and speed_kmh <= MOVEMENT_THRESHOLD_KMH:
        return (False, f"Low speed: {speed_kmh:.1f} km/h")
    
    # Default: Assume stationary if we can't determine
    return (False, "Cannot determine movement")


def check_distance_from_clock_in(emp_email: str, current_lat: str, current_lon: str, 
                                 speed_kmh: Optional[float] = None) -> Tuple[Dict, int]:
    """
    Check if current location is >1km from clock-in location
    
    ONLY checks if:
    1. It's a working day
    2. User is moving
    3. User is currently clocked in
    
    Args:
        emp_email: Employee email
        current_lat: Current latitude
        current_lon: Current longitude
        speed_kmh: Current speed in km/h (optional, helps determine if moving)
    
    Returns:
        Response with distance info and alert status
    """
    if not current_lat or not current_lon:
        return ({"success": False, "message": "Current location required"}, 400)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Get active attendance session
        cursor.execute("""
            SELECT 
                id as attendance_id,
                login_time,
                login_location,
                login_address,
                date
            FROM attendance
            WHERE employee_email = %s AND logout_time IS NULL
            ORDER BY login_time DESC LIMIT 1
        """, (emp_email,))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({
                "success": False,
                "message": "No active clock-in session found",
                "requires_check": False
            }, 404)
        
        attendance_id = attendance['attendance_id']
        work_date = attendance['date']
        
        # 2. Check if working day
        is_working, day_reason = is_working_day(work_date)
        
        if not is_working:
            logger.info(f"⏭️  Skipping distance check - {day_reason}")
            return ({
                "success": True,
                "message": f"Distance check not required on {day_reason}",
                "requires_check": False,
                "reason": day_reason
            }, 200)
        
        # 3. Get last tracked location to check movement
        cursor.execute("""
            SELECT 
                fvt.latitude as last_lat,
                fvt.longitude as last_lon,
                fvt.tracked_at
            FROM field_visit_tracking fvt
            JOIN field_visits fv ON fvt.field_visit_id = fv.id
            WHERE fv.attendance_id = %s
            ORDER BY fvt.tracked_at DESC
            LIMIT 1
        """, (attendance_id,))
        
        last_location = cursor.fetchone()
        last_lat = str(last_location['last_lat']) if last_location else None
        last_lon = str(last_location['last_lon']) if last_location else None
        
        # 4. Check if user is moving
        moving, movement_reason = is_user_moving(speed_kmh, last_lat, last_lon, current_lat, current_lon)
        
        if not moving:
            logger.debug(f"⏭️  Skipping distance check - User stationary: {movement_reason}")
            return ({
                "success": True,
                "message": f"Distance check not required - {movement_reason}",
                "requires_check": False,
                "reason": movement_reason
            }, 200)
        
        # 5. Parse clock-in location
        login_coords = attendance.get('login_location', '').split(', ')
        
        if len(login_coords) < 2:
            return ({
                "success": False,
                "message": "Clock-in location not available",
                "requires_check": False
            }, 400)
        
        clock_in_lat = float(login_coords[0])
        clock_in_lon = float(login_coords[1])
        
        # 6. Calculate distance from clock-in location
        distance_km = haversine_distance(
            clock_in_lat, clock_in_lon,
            float(current_lat), float(current_lon)
        )
        
        # 7. Check if exceeds threshold
        exceeds_threshold = distance_km > DISTANCE_THRESHOLD_KM
        
        response_data = {
            "attendance_id": attendance_id,
            "clock_in_location": {
                "latitude": str(clock_in_lat),
                "longitude": str(clock_in_lon),
                "address": attendance.get('login_address', '')
            },
            "current_location": {
                "latitude": current_lat,
                "longitude": current_lon
            },
            "distance_km": round(distance_km, 3),
            "threshold_km": DISTANCE_THRESHOLD_KM,
            "exceeds_threshold": exceeds_threshold,
            "is_moving": True,
            "movement_reason": movement_reason,
            "speed_kmh": speed_kmh,
            "work_date": str(work_date),
            "is_working_day": True,
            "requires_check": True
        }
        
        # 8. Create alert/activity if threshold exceeded
        if exceeds_threshold:
            # Check if alert already exists for this session
            cursor.execute("""
                SELECT id FROM activities
                WHERE attendance_id = %s 
                AND activity_type = 'distance_alert'
                AND status = 'active'
            """, (attendance_id,))
            
            existing_alert = cursor.fetchone()
            
            if not existing_alert:
                # Create distance alert activity
                cursor.execute("""
                    INSERT INTO activities (
                        attendance_id,
                        employee_email,
                        employee_name,
                        activity_type,
                        start_time,
                        start_location,
                        notes,
                        date,
                        status
                    ) 
                    SELECT 
                        %s,
                        employee_email,
                        employee_name,
                        'distance_alert',
                        NOW(),
                        %s,
                        %s,
                        %s,
                        'active'
                    FROM attendance
                    WHERE id = %s
                    RETURNING id
                """, (
                    attendance_id,
                    f"{current_lat}, {current_lon}",
                    f"Employee moved {distance_km:.2f}km from clock-in location (threshold: {DISTANCE_THRESHOLD_KM}km)",
                    work_date,
                    attendance_id
                ))
                
                alert_id = cursor.fetchone()['id']
                conn.commit()
                
                logger.warning(f"⚠️  DISTANCE ALERT: Employee {emp_email} is {distance_km:.2f}km from clock-in location")
                
                response_data['alert_created'] = True
                response_data['alert_id'] = alert_id
                response_data['alert_message'] = f"You are {distance_km:.2f}km from your clock-in location"
            else:
                response_data['alert_created'] = False
                response_data['alert_id'] = existing_alert['id']
                response_data['alert_message'] = "Distance alert already active"
        
        return ({
            "success": True,
            "message": "Distance checked" + (" - ALERT!" if exceeds_threshold else " - OK"),
            "data": response_data
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Distance check error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def clear_distance_alert(attendance_id: int) -> Tuple[Dict, int]:
    """
    Clear distance alert when user returns within threshold
    or when they clock out
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE activities
            SET 
                status = 'completed',
                end_time = NOW(),
                duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
            WHERE attendance_id = %s 
            AND activity_type = 'distance_alert'
            AND status = 'active'
            RETURNING id
        """, (attendance_id,))
        
        updated = cursor.fetchall()
        conn.commit()
        
        if updated:
            logger.info(f"✅ Distance alert cleared for attendance {attendance_id}")
            return ({
                "success": True,
                "message": "Distance alert cleared",
                "alerts_cleared": len(updated)
            }, 200)
        else:
            return ({
                "success": True,
                "message": "No active distance alerts",
                "alerts_cleared": 0
            }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Clear alert error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_distance_alerts(emp_email: str) -> Tuple[Dict, int]:
    """
    Get all active distance alerts for employee
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                a.id as alert_id,
                a.attendance_id,
                a.start_time,
                a.start_location,
                a.notes,
                att.login_location as clock_in_location,
                att.login_address as clock_in_address
            FROM activities a
            JOIN attendance att ON a.attendance_id = att.id
            WHERE a.employee_email = %s
            AND a.activity_type = 'distance_alert'
            AND a.status = 'active'
            ORDER BY a.start_time DESC
        """, (emp_email,))
        
        alerts = cursor.fetchall()
        
        # Parse coordinates
        for alert in alerts:
            for key, value in alert.items():
                if isinstance(value, datetime):
                    alert[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            current_coords = alert.get('start_location', '').split(', ')
            alert['current_latitude'] = current_coords[0] if len(current_coords) > 0 else ''
            alert['current_longitude'] = current_coords[1] if len(current_coords) > 1 else ''
            
            clock_in_coords = alert.get('clock_in_location', '').split(', ')
            alert['clock_in_latitude'] = clock_in_coords[0] if len(clock_in_coords) > 0 else ''
            alert['clock_in_longitude'] = clock_in_coords[1] if len(clock_in_coords) > 1 else ''
        
        return ({
            "success": True,
            "data": {
                "alerts": alerts,
                "count": len(alerts)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()