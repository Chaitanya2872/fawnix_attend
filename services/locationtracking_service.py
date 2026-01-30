"""
Location Tracking Service
Periodic location tracking for active activities (every 5 minutes)
"""

from datetime import datetime
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
import logging

logger = logging.getLogger(__name__)


def track_location(activity_id, emp_email, lat, lon, tracking_type='auto'):
    """
    Track location for an active activity
    
    Args:
        activity_id: ID of the active activity
        emp_email: Employee email
        lat: Latitude
        lon: Longitude
        tracking_type: 'auto' (5-min intervals) or 'manual' (user triggered)
    """
    if not lat or not lon:
        return ({"success": False, "message": "Location coordinates required"}, 400)
    
    location = f"{lat}, {lon}"
    address = get_address_from_coordinates(lat, lon)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify activity is active
        cursor.execute("""
            SELECT id, activity_type, employee_email 
            FROM activities
            WHERE id = %s AND status = 'active' AND employee_email = %s
        """, (activity_id, emp_email))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Active activity not found"}, 404)
        
        tracked_at = datetime.now()
        
        # Insert tracking point
        cursor.execute("""
            INSERT INTO location_tracking (
                activity_id, employee_email, location, address,
                tracked_at, tracking_type
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            activity_id, emp_email, location, address,
            tracked_at, tracking_type
        ))
        
        tracking_id = cursor.fetchone()['id']
        conn.commit()
        
        return ({
            "success": True,
            "message": "Location tracked",
            "data": {
                "tracking_id": tracking_id,
                "activity_id": activity_id,
                "tracked_at": tracked_at.strftime('%Y-%m-%d %H:%M:%S'),
                "location": {
                    "coordinates": location,
                    "latitude": lat,
                    "longitude": lon,
                    "address": address
                },
                "tracking_type": tracking_type
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Track location error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_active_activities():
    """Get all active activities that need tracking"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, employee_email, activity_type, start_time
            FROM activities
            WHERE status = 'active'
            ORDER BY start_time DESC
        """)
        
        activities = cursor.fetchall()
        
        return ({
            "success": True,
            "data": {
                "activities": activities,
                "count": len(activities)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def auto_track_active_activities():
    """
    🚀 AUTOMATIC GPS TRACKING (runs every 3 minutes)
    
    Periodically tracks all active activities from the database.
    This is called by the APScheduler job.
    
    NOTE: For this to work properly, the mobile app needs to send
    GPS coordinates every 3 minutes via the track_location endpoint.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all active activities
        cursor.execute("""
            SELECT id, employee_email, activity_type, start_time
            FROM activities
            WHERE status = 'active'
            ORDER BY start_time DESC
        """)
        
        activities = cursor.fetchall()
        
        if not activities:
            logger.debug("ℹ️ No active activities to track")
            return
        
        logger.info(f"📍 GPS Tracking Check: {len(activities)} active activities")
        
        # Note: This is a scheduler job that checks for active activities
        # The actual location data must be sent by the mobile app via /track endpoint
        # For continuous tracking to work:
        # 1. Mobile app must have GPS enabled
        # 2. Mobile app sends location every 3 minutes to /api/activities/track
        # 3. Server saves these to location_tracking table
        
        activity_ids = [a['id'] for a in activities]
        
        # Log summary of what's being tracked
        for activity in activities:
            cursor.execute("""
                SELECT COUNT(*) as count FROM location_tracking
                WHERE activity_id = %s
            """, (activity['id'],))
            
            tracking_count = cursor.fetchone()['count']
            logger.debug(f"   Activity {activity['id']}: {activity['activity_type']} - {tracking_count} tracking points")
        
        return {
            "status": "checking",
            "active_activities": len(activities),
            "activity_ids": activity_ids
        }
        
    except Exception as e:
        logger.error(f"❌ Auto track error: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        cursor.close()
        conn.close()


def get_tracking_history(activity_id):
    """Get all tracking points for an activity"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM location_tracking
            WHERE activity_id = %s
            ORDER BY tracked_at ASC
        """, (activity_id,))
        
        points = cursor.fetchall()
        
        # Parse coordinates and convert datetime
        for point in points:
            for key, value in point.items():
                if isinstance(value, datetime):
                    point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            coords = point.get('location', '').split(', ')
            point['latitude'] = coords[0] if len(coords) > 0 else ''
            point['longitude'] = coords[1] if len(coords) > 1 else ''
        
        return ({
            "success": True,
            "data": {
                "tracking_points": points,
                "total_points": len(points)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_employee_tracking_summary(emp_email, date=None):
    """Get tracking summary for an employee on a specific date"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if not date:
            date = datetime.now().date()
        
        # Get all activities for the date
        cursor.execute("""
            SELECT a.*, 
                   COUNT(lt.id) as tracking_count
            FROM activities a
            LEFT JOIN location_tracking lt ON a.id = lt.activity_id
            WHERE a.employee_email = %s AND a.date = %s
            GROUP BY a.id
            ORDER BY a.start_time DESC
        """, (emp_email, date))
        
        activities = cursor.fetchall()
        
        # Convert datetime
        for activity in activities:
            for key, value in activity.items():
                if isinstance(value, datetime):
                    activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        total_tracking_points = sum([a.get('tracking_count', 0) for a in activities])
        
        return ({
            "success": True,
            "data": {
                "date": str(date),
                "activities": activities,
                "total_activities": len(activities),
                "total_tracking_points": total_tracking_points
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def calculate_distance_traveled(activity_id):
    """
    Calculate approximate distance traveled during an activity
    Uses Haversine formula for distance between GPS points
    """
    from math import radians, sin, cos, sqrt, atan2
    
    def haversine(lat1, lon1, lat2, lon2):
        """Calculate distance between two GPS points in kilometers"""
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get activity with start location
        cursor.execute("""
            SELECT start_location FROM activities WHERE id = %s
        """, (activity_id,))
        
        activity = cursor.fetchone()
        
        if not activity or not activity.get('start_location'):
            return ({"success": False, "message": "Activity not found"}, 404)
        
        # Get all tracking points
        cursor.execute("""
            SELECT location FROM location_tracking
            WHERE activity_id = %s
            ORDER BY tracked_at ASC
        """, (activity_id,))
        
        points = cursor.fetchall()
        
        if not points:
            return ({
                "success": True,
                "data": {
                    "distance_km": 0,
                    "distance_miles": 0,
                    "tracking_points": 0
                }
            }, 200)
        
        # Build complete route
        route = [activity['start_location']] + [p['location'] for p in points]
        
        # Calculate total distance
        total_distance = 0
        for i in range(len(route) - 1):
            coords1 = route[i].split(', ')
            coords2 = route[i+1].split(', ')
            
            if len(coords1) == 2 and len(coords2) == 2:
                try:
                    distance = haversine(coords1[0], coords1[1], coords2[0], coords2[1])
                    total_distance += distance
                except:
                    pass
        
        return ({
            "success": True,
            "data": {
                "distance_km": round(total_distance, 2),
                "distance_miles": round(total_distance * 0.621371, 2),
                "tracking_points": len(points),
                "route_segments": len(route) - 1
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()