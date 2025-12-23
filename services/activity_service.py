"""
Activity Service
Enhanced with route tracking for field visits and branch visits
"""

from datetime import datetime
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
from config import ActivityType
import logging
import json

logger = logging.getLogger(__name__)


def start_activity(emp_email, emp_name, activity_type, lat, lon, notes='', destinations=None):
    """
    Start new activity with optional destinations for field/branch visits
    
    Args:
        destinations: List of destination dicts with {name, lat, lon, address (optional)}
    """
    if activity_type not in ActivityType.all():
        return ({"success": False, "message": "Invalid activity type"}, 400)
    
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        start_time = datetime.now()
        
        # Store destinations as JSON if provided
        destinations_json = None
        if destinations and isinstance(destinations, list):
            # Validate and enrich destinations
            enriched_destinations = []
            for idx, dest in enumerate(destinations):
                dest_data = {
                    'sequence': idx + 1,
                    'name': dest.get('name', f'Destination {idx + 1}'),
                    'latitude': dest.get('lat', ''),
                    'longitude': dest.get('lon', ''),
                    'coordinates': f"{dest.get('lat', '')}, {dest.get('lon', '')}" if dest.get('lat') and dest.get('lon') else '',
                    'address': dest.get('address') or (get_address_from_coordinates(dest.get('lat'), dest.get('lon')) if dest.get('lat') and dest.get('lon') else ''),
                    'visited': False,
                    'visited_at': None
                }
                enriched_destinations.append(dest_data)
            
            destinations_json = json.dumps(enriched_destinations)
        
        cursor.execute("""
            INSERT INTO activities (
                employee_email, employee_name, activity_type,
                start_time, start_location, start_address,
                notes, date, status, destinations
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            emp_email, emp_name, activity_type,
            start_time, location, address,
            notes, start_time.date(), 'active', destinations_json
        ))
        
        activity_id = cursor.fetchone()['id']
        conn.commit()
        
        response_data = {
            "activity_id": activity_id,
            "activity_type": activity_type,
            "start_time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
            "start_location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            }
        }
        
        if destinations_json:
            response_data['destinations'] = json.loads(destinations_json)
        
        return ({
            "success": True,
            "message": "Activity started. Location tracking enabled every 5 minutes.",
            "data": response_data
        }, 201)
    except Exception as e:
        conn.rollback()
        logger.error(f"Start activity error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def mark_destination_visited(activity_id, destination_sequence, lat, lon):
    """Mark a destination as visited"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT destinations FROM activities
            WHERE id = %s AND status = 'active'
        """, (activity_id,))
        
        result = cursor.fetchone()
        
        if not result or not result['destinations']:
            return ({"success": False, "message": "Activity or destinations not found"}, 404)
        
        destinations = json.loads(result['destinations'])
        
        # Find and update the destination
        destination_found = False
        for dest in destinations:
            if dest['sequence'] == destination_sequence:
                dest['visited'] = True
                dest['visited_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                dest['actual_latitude'] = lat
                dest['actual_longitude'] = lon
                dest['actual_coordinates'] = f"{lat}, {lon}"
                dest['actual_address'] = get_address_from_coordinates(lat, lon) if lat and lon else ''
                destination_found = True
                break
        
        if not destination_found:
            return ({"success": False, "message": "Destination not found"}, 404)
        
        cursor.execute("""
            UPDATE activities
            SET destinations = %s
            WHERE id = %s
        """, (json.dumps(destinations), activity_id))
        
        conn.commit()
        
        return ({
            "success": True,
            "message": "Destination marked as visited",
            "data": {"destinations": destinations}
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Mark destination visited error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def end_activity(activity_id, lat, lon):
    """End activity with end location"""
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM activities
            WHERE id = %s AND status = 'active'
        """, (activity_id,))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Activity not found"}, 404)
        
        end_time = datetime.now()
        start_time = activity['start_time']
        
        if isinstance(start_time, str):
            start_time = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
        
        duration = int((end_time - start_time).total_seconds() / 60)
        
        # Get tracking points count
        cursor.execute("""
            SELECT COUNT(*) as count FROM location_tracking
            WHERE activity_id = %s
        """, (activity_id,))
        
        tracking_count = cursor.fetchone()['count']
        
        cursor.execute("""
            UPDATE activities
            SET end_time = %s, end_location = %s,
                end_address = %s, duration_minutes = %s, status = %s
            WHERE id = %s
        """, (end_time, location, address, duration, 'completed', activity_id))
        
        conn.commit()
        
        # Parse start coordinates
        start_coords = activity.get('start_location', '').split(', ')
        start_lat = start_coords[0] if len(start_coords) > 0 else ''
        start_lon = start_coords[1] if len(start_coords) > 1 else ''
        
        response_data = {
            "activity_id": activity_id,
            "duration_minutes": duration,
            "tracking_points": tracking_count,
            "start_location": {
                "coordinates": activity.get('start_location', ''),
                "latitude": start_lat,
                "longitude": start_lon,
                "address": activity.get('start_address', '')
            },
            "end_location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            }
        }
        
        # Include destinations if available
        if activity.get('destinations'):
            response_data['destinations'] = json.loads(activity['destinations'])
        
        return ({
            "success": True,
            "message": "Activity ended",
            "data": response_data
        }, 200)
    except Exception as e:
        conn.rollback()
        logger.error(f"End activity error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_activities(emp_email, limit=50, activity_type=None):
    """Get activities with coordinates"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM activities WHERE employee_email = %s"
        params = [emp_email]
        
        if activity_type:
            query += " AND activity_type = %s"
            params.append(activity_type)
        
        query += " ORDER BY start_time DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        activities = cursor.fetchall()
        
        # Convert datetime to string and parse coordinates
        for activity in activities:
            for key, value in activity.items():
                if isinstance(value, datetime):
                    activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            # Parse start coordinates
            start_coords = activity.get('start_location', '').split(', ')
            activity['start_lat'] = start_coords[0] if len(start_coords) > 0 else ''
            activity['start_lon'] = start_coords[1] if len(start_coords) > 1 else ''
            
            # Parse end coordinates
            end_location = activity.get('end_location', '')
            if end_location:
                end_coords = end_location.split(', ')
                activity['end_lat'] = end_coords[0] if len(end_coords) > 0 else ''
                activity['end_lon'] = end_coords[1] if len(end_coords) > 1 else ''
            
            # Parse destinations
            if activity.get('destinations'):
                try:
                    activity['destinations'] = json.loads(activity['destinations'])
                except:
                    pass
        
        return ({
            "success": True,
            "data": {"activities": activities, "count": len(activities)}
        }, 200)
    finally:
        cursor.close()
        conn.close()


def get_activity_route(activity_id):
    """Get complete route with all tracking points for an activity"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get activity details
        cursor.execute("""
            SELECT * FROM activities WHERE id = %s
        """, (activity_id,))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Activity not found"}, 404)
        
        # Get all tracking points
        cursor.execute("""
            SELECT * FROM location_tracking
            WHERE activity_id = %s
            ORDER BY tracked_at ASC
        """, (activity_id,))
        
        tracking_points = cursor.fetchall()
        
        # Convert datetime and parse coordinates
        for point in tracking_points:
            for key, value in point.items():
                if isinstance(value, datetime):
                    point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            
            coords = point.get('location', '').split(', ')
            point['latitude'] = coords[0] if len(coords) > 0 else ''
            point['longitude'] = coords[1] if len(coords) > 1 else ''
        
        # Parse activity coordinates
        start_coords = activity.get('start_location', '').split(', ')
        end_coords = activity.get('end_location', '').split(', ') if activity.get('end_location') else ['', '']
        
        route_data = {
            "activity_id": activity_id,
            "activity_type": activity['activity_type'],
            "start_time": activity['start_time'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(activity['start_time'], datetime) else activity['start_time'],
            "end_time": activity['end_time'].strftime('%Y-%m-%d %H:%M:%S') if activity.get('end_time') and isinstance(activity['end_time'], datetime) else activity.get('end_time'),
            "duration_minutes": activity.get('duration_minutes'),
            "start_location": {
                "coordinates": activity.get('start_location', ''),
                "latitude": start_coords[0] if len(start_coords) > 0 else '',
                "longitude": start_coords[1] if len(start_coords) > 1 else '',
                "address": activity.get('start_address', '')
            },
            "end_location": {
                "coordinates": activity.get('end_location', ''),
                "latitude": end_coords[0] if len(end_coords) > 0 else '',
                "longitude": end_coords[1] if len(end_coords) > 1 else '',
                "address": activity.get('end_address', '')
            } if activity.get('end_location') else None,
            "tracking_points": tracking_points,
            "total_points": len(tracking_points)
        }
        
        # Include destinations if available
        if activity.get('destinations'):
            try:
                route_data['destinations'] = json.loads(activity['destinations'])
            except:
                pass
        
        return ({
            "success": True,
            "data": route_data
        }, 200)
        
    finally:
        cursor.close()
        conn.close()


def start_break(emp_email, emp_name, break_type):
    """Start break"""
    if break_type not in ActivityType.breaks():
        return ({"success": False, "message": "Invalid break type"}, 400)
    
    return start_activity(emp_email, emp_name, break_type, '', '', '')


def end_break(break_id):
    """End break"""
    return end_activity(break_id, '', '')