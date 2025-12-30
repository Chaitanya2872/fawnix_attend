"""
Field Visit Service
GPS tracking service for field visits (Rapido-style 3-minute intervals)
"""

from datetime import datetime, date
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
import logging
from math import radians, sin, cos, sqrt, atan2

logger = logging.getLogger(__name__)


def track_location(field_visit_id: int, lat: str, lon: str, 
                  speed_kmh: float = None, accuracy_meters: float = None,
                  tracking_type: str = 'auto'):
    """
    Track location for an active field visit
    
    Args:
        field_visit_id: ID of the active field visit
        lat: Latitude
        lon: Longitude
        speed_kmh: Current speed in km/h (optional)
        accuracy_meters: GPS accuracy in meters (optional)
        tracking_type: 'auto' (3-min intervals), 'manual' (user triggered), 'checkpoint' (destination)
    
    Returns:
        Success response with tracking point details
    """
    if not lat or not lon:
        return ({"success": False, "message": "Location coordinates required"}, 400)
    
    address = get_address_from_coordinates(lat, lon)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify field visit is active
        cursor.execute("""
            SELECT id, employee_email, start_time, status
            FROM field_visits
            WHERE id = %s AND status = 'active'
        """, (field_visit_id,))
        
        field_visit = cursor.fetchone()
        
        if not field_visit:
            return ({"success": False, "message": "Active field visit not found"}, 404)
        
        tracked_at = datetime.now()
        
        # Insert tracking point
        cursor.execute("""
            INSERT INTO field_visit_tracking (
                field_visit_id, latitude, longitude, address,
                speed_kmh, accuracy_meters,
                tracked_at, tracking_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            field_visit_id, lat, lon, address,
            speed_kmh, accuracy_meters,
            tracked_at, tracking_type
        ))
        
        tracking_id = cursor.fetchone()['id']
        
        # Calculate and update total distance
        update_total_distance(cursor, field_visit_id)
        
        conn.commit()
        
        logger.info(f"📍 Location tracked: FV={field_visit_id}, Type={tracking_type}")
        
        return ({
            "success": True,
            "message": "Location tracked successfully",
            "data": {
                "tracking_id": tracking_id,
                "field_visit_id": field_visit_id,
                "tracked_at": tracked_at.strftime('%Y-%m-%d %H:%M:%S'),
                "location": {
                    "latitude": lat,
                    "longitude": lon,
                    "address": address
                },
                "tracking_type": tracking_type,
                "speed_kmh": speed_kmh,
                "accuracy_meters": accuracy_meters
            }
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Track location error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def update_total_distance(cursor, field_visit_id: int):
    """
    Calculate and update total distance for a field visit
    Uses Haversine formula for distance between GPS points
    """
    try:
        # Get all tracking points in order
        cursor.execute("""
            SELECT latitude, longitude
            FROM field_visit_tracking
            WHERE field_visit_id = %s
            ORDER BY tracked_at ASC
        """, (field_visit_id,))
        
        points = cursor.fetchall()
        
        if len(points) < 2:
            return  # Need at least 2 points to calculate distance
        
        total_distance = 0
        
        # Calculate distance between consecutive points
        for i in range(len(points) - 1):
            lat1 = float(points[i]['latitude'])
            lon1 = float(points[i]['longitude'])
            lat2 = float(points[i + 1]['latitude'])
            lon2 = float(points[i + 1]['longitude'])
            
            distance = haversine(lat1, lon1, lat2, lon2)
            total_distance += distance
        
        # Update field visit
        cursor.execute("""
            UPDATE field_visits
            SET total_distance_km = %s
            WHERE id = %s
        """, (round(total_distance, 2), field_visit_id))
        
        logger.debug(f"Distance updated: FV={field_visit_id}, Total={total_distance:.2f}km")
        
    except Exception as e:
        logger.error(f"❌ Update distance error: {e}")


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS points in kilometers using Haversine formula
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def get_active_field_visits():
    """
    Get all active field visits that need tracking
    Used by background scheduler for 3-minute interval tracking
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                fv.id,
                fv.employee_email,
                fv.employee_name,
                fv.visit_type,
                fv.start_time,
                (SELECT MAX(tracked_at) FROM field_visit_tracking 
                 WHERE field_visit_id = fv.id) as last_tracked_at
            FROM field_visits fv
            WHERE fv.status = 'active'
            ORDER BY fv.start_time DESC
        """)
        
        field_visits = cursor.fetchall()
        
        # Convert datetime
        for fv in field_visits:
            for key, value in fv.items():
                if isinstance(value, datetime):
                    fv[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "field_visits": field_visits,
                "count": len(field_visits)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_tracking_history(field_visit_id: int):
    """Get all tracking points for a field visit"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get field visit details
        cursor.execute("""
            SELECT * FROM field_visits WHERE id = %s
        """, (field_visit_id,))
        
        field_visit = cursor.fetchone()
        
        if not field_visit:
            return ({"success": False, "message": "Field visit not found"}, 404)
        
        # Get tracking points
        cursor.execute("""
            SELECT * FROM field_visit_tracking
            WHERE field_visit_id = %s
            ORDER BY tracked_at ASC
        """, (field_visit_id,))
        
        points = cursor.fetchall()
        
        # Convert datetime
        for key, value in field_visit.items():
            if isinstance(value, datetime):
                field_visit[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        for point in points:
            for key, value in point.items():
                if isinstance(value, datetime):
                    point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        return ({
            "success": True,
            "data": {
                "field_visit": field_visit,
                "tracking_points": points,
                "total_points": len(points),
                "total_distance_km": float(field_visit.get('total_distance_km') or 0)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_field_visit_summary(emp_email: str, date: date = None):
    """
    Get field visit summary for an employee on a specific date
    
    Returns:
    - All field visits
    - Total tracking points
    - Total distance traveled
    """
    if not date:
        date = datetime.now().date()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all field visits for the date
        cursor.execute("""
            SELECT 
                fv.*,
                (SELECT COUNT(*) FROM field_visit_tracking 
                 WHERE field_visit_id = fv.id) as tracking_count
            FROM field_visits fv
            WHERE fv.employee_email = %s AND fv.date = %s
            ORDER BY fv.start_time DESC
        """, (emp_email, date))
        
        field_visits = cursor.fetchall()
        
        # Convert datetime
        for fv in field_visits:
            for key, value in fv.items():
                if isinstance(value, datetime):
                    fv[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        total_tracking_points = sum([fv.get('tracking_count', 0) for fv in field_visits])
        total_distance = sum([float(fv.get('total_distance_km') or 0) for fv in field_visits])
        
        return ({
            "success": True,
            "data": {
                "date": str(date),
                "field_visits": field_visits,
                "total_field_visits": len(field_visits),
                "total_tracking_points": total_tracking_points,
                "total_distance_km": round(total_distance, 2)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def get_route_map_data(field_visit_id: int):
    """
    Get route map data for visualization
    Returns data formatted for map rendering
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get field visit
        cursor.execute("""
            SELECT * FROM field_visits WHERE id = %s
        """, (field_visit_id,))
        
        field_visit = cursor.fetchone()
        
        if not field_visit:
            return ({"success": False, "message": "Field visit not found"}, 404)
        
        # Get all tracking points
        cursor.execute("""
            SELECT 
                latitude, longitude, address, speed_kmh,
                tracked_at, tracking_type
            FROM field_visit_tracking
            WHERE field_visit_id = %s
            ORDER BY tracked_at ASC
        """, (field_visit_id,))
        
        points = cursor.fetchall()
        
        # Convert datetime
        for point in points:
            for key, value in point.items():
                if isinstance(value, datetime):
                    point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        # Build route coordinates array for map
        route_coordinates = []
        
        # Add start point
        if field_visit.get('start_latitude') and field_visit.get('start_longitude'):
            route_coordinates.append({
                "lat": float(field_visit['start_latitude']),
                "lng": float(field_visit['start_longitude']),
                "type": "start",
                "address": field_visit.get('start_address', '')
            })
        
        # Add tracking points
        for point in points:
            route_coordinates.append({
                "lat": float(point['latitude']),
                "lng": float(point['longitude']),
                "type": point['tracking_type'],
                "address": point.get('address', ''),
                "speed_kmh": float(point['speed_kmh']) if point.get('speed_kmh') else None,
                "time": point['tracked_at']
            })
        
        # Add end point
        if field_visit.get('end_latitude') and field_visit.get('end_longitude'):
            route_coordinates.append({
                "lat": float(field_visit['end_latitude']),
                "lng": float(field_visit['end_longitude']),
                "type": "end",
                "address": field_visit.get('end_address', '')
            })
        
        return ({
            "success": True,
            "data": {
                "field_visit_id": field_visit_id,
                "status": field_visit['status'],
                "total_distance_km": float(field_visit.get('total_distance_km') or 0),
                "duration_minutes": field_visit.get('duration_minutes'),
                "route_coordinates": route_coordinates,
                "total_points": len(route_coordinates)
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def calculate_visit_statistics(field_visit_id: int):
    """
    Calculate detailed statistics for a field visit
    
    Returns:
    - Total distance
    - Average speed
    - Time spent moving vs stationary
    - Number of stops
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get field visit
        cursor.execute("""
            SELECT * FROM field_visits WHERE id = %s
        """, (field_visit_id,))
        
        field_visit = cursor.fetchone()
        
        if not field_visit:
            return ({"success": False, "message": "Field visit not found"}, 404)
        
        # Get tracking points
        cursor.execute("""
            SELECT latitude, longitude, speed_kmh, tracked_at
            FROM field_visit_tracking
            WHERE field_visit_id = %s
            ORDER BY tracked_at ASC
        """, (field_visit_id,))
        
        points = cursor.fetchall()
        
        if not points:
            return ({
                "success": True,
                "data": {
                    "total_distance_km": 0,
                    "average_speed_kmh": 0,
                    "max_speed_kmh": 0,
                    "tracking_points": 0,
                    "stops_count": 0
                }
            }, 200)
        
        # Calculate statistics
        speeds = [float(p['speed_kmh']) for p in points if p.get('speed_kmh')]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        max_speed = max(speeds) if speeds else 0
        
        # Count stops (speed < 5 km/h)
        stops = len([s for s in speeds if s < 5])
        
        return ({
            "success": True,
            "data": {
                "total_distance_km": float(field_visit.get('total_distance_km') or 0),
                "average_speed_kmh": round(avg_speed, 2),
                "max_speed_kmh": round(max_speed, 2),
                "tracking_points": len(points),
                "stops_count": stops,
                "duration_minutes": field_visit.get('duration_minutes')
            }
        }, 200)
        
    finally:
        cursor.close()
        conn.close()