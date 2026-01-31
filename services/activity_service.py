from datetime import datetime
from database.connection import get_db_connection
from services.geocoding_service import get_address_from_coordinates
from config import ActivityType
import logging
import json

logger = logging.getLogger(__name__)


def start_activity(emp_email: str, emp_name: str, activity_type: str, 
                  lat: str, lon: str, notes: str = '', destinations: list = None):
    """
    Start activity
    
    ✅ ALLOWED ACTIVITY TYPES:
    - branch_visit: Visit to branch office
    - field_visit: General field work
    - meal_break: Lunch break
    - tea_break: Tea/coffee break
    - rest_break: Rest/personal break
    
    ❌ NOT ALLOWED (use attendance exceptions API):
    - late_arrival → Use /api/attendance-exceptions/late-arrival
    - early_leave → Use /api/attendance-exceptions/early-leave
    
    Args:
        emp_email: Employee email
        emp_name: Employee full name
        activity_type: Type of activity
        lat: Latitude
        lon: Longitude
        notes: Additional notes
        destinations: List of destinations for branch visits
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    
    # ✅ ONLY ALLOW REAL ACTIVITIES (no attendance exceptions)
    VALID_ACTIVITY_TYPES = [
        'branch_visit',
        'field_visit',
        'meal_break',
        'tea_break',
        'rest_break'
    ]
    
    if activity_type not in VALID_ACTIVITY_TYPES:
        error_message = f"Invalid activity type: '{activity_type}'. "
        
        # Provide helpful error for removed types
        if activity_type in ['late_arrival', 'early_leave']:
            error_message += f"\n\n'{activity_type}' is no longer an activity. "
            error_message += f"Please use the attendance exceptions API:\n"
            if activity_type == 'late_arrival':
                error_message += "→ POST /api/attendance-exceptions/late-arrival"
            else:
                error_message += "→ POST /api/attendance-exceptions/early-leave"
        else:
            error_message += f"Valid types: {', '.join(VALID_ACTIVITY_TYPES)}"
        
        return ({
            "success": False,
            "message": error_message
        }, 400)
    
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 🔒 GUARD 1: Check for active attendance session
        cursor.execute("""
            SELECT id FROM attendance
            WHERE employee_email = %s AND logout_time IS NULL
        """, (emp_email,))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({
                "success": False,
                "message": "You must clock in before starting any activity"
            }, 400)
        
        attendance_id = attendance['id']
        
        # 🔒 GUARD 2: Check for active activity
        cursor.execute("""
            SELECT id, activity_type FROM activities
            WHERE attendance_id = %s AND status = 'active'
        """, (attendance_id,))
        
        active_activity = cursor.fetchone()
        
        if active_activity:
            return ({
                "success": False,
                "message": f"You have an active '{active_activity['activity_type']}'. Please end it before starting a new activity.",
                "data": {
                    "active_activity_id": active_activity['id'],
                    "active_activity_type": active_activity['activity_type']
                }
            }, 400)
        
        start_time = datetime.now()
        field_visit_id = None
        
        # Process destinations for branch visits
        destinations_json = None
        if destinations and isinstance(destinations, list) and activity_type in ['branch_visit', 'field_visit']:
            enriched_destinations = []
            for idx, dest in enumerate(destinations):
                dest_lat = dest.get('lat', '')
                dest_lon = dest.get('lon', '')
                
                dest_data = {
                    'sequence': idx + 1,
                    'name': dest.get('name', f'Destination {idx + 1}'),
                    'latitude': dest_lat,
                    'longitude': dest_lon,
                    'coordinates': f"{dest_lat}, {dest_lon}" if dest_lat and dest_lon else '',
                    'address': dest.get('address') or (
                        get_address_from_coordinates(dest_lat, dest_lon) 
                        if dest_lat and dest_lon else ''
                    ),
                    'visited': False,
                    'visited_at': None
                }
                enriched_destinations.append(dest_data)
            
            destinations_json = json.dumps(enriched_destinations)
        
        # If this is a branch visit or field visit, create field_visit record first
        if activity_type in ['branch_visit', 'field_visit']:
            cursor.execute("""
                INSERT INTO field_visits (
                    attendance_id, employee_email, employee_name,
                    visit_type, purpose,
                    start_time, date,
                    start_latitude, start_longitude, start_address,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                attendance_id, emp_email, emp_name,
                activity_type, notes,
                start_time, start_time.date(),
                lat, lon, address,
                'active'
            ))
            
            field_visit_id = cursor.fetchone()['id']
            logger.info(f"🏢 Field visit created: ID={field_visit_id}")
        
        # Create activity record
        cursor.execute("""
            INSERT INTO activities (
                attendance_id, field_visit_id,
                employee_email, employee_name, activity_type,
                start_time, start_location, start_address,
                notes, date, status, destinations
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            attendance_id, field_visit_id,
            emp_email, emp_name, activity_type,
            start_time, location, address,
            notes, start_time.date(), 'active', destinations_json
        ))
        
        activity_id = cursor.fetchone()['id']
        
        # ✅ ENABLE GPS MODE: Save initial location immediately
        tracking_id = None
        if lat and lon:
            cursor.execute("""
                INSERT INTO location_tracking (
                    activity_id, employee_email, location, address,
                    tracked_at, tracking_type
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                activity_id, emp_email, location, address,
                start_time, 'initial'
            ))
            tracking_id = cursor.fetchone()['id']
            logger.info(f"📍 Initial GPS location saved: Tracking ID={tracking_id}")
        
        conn.commit()
        
        logger.info(f"✅ Activity started: ID={activity_id}, Type={activity_type}, Attendance={attendance_id}")
        
        response_data = {
            "activity_id": activity_id,
            "attendance_id": attendance_id,
            "activity_type": activity_type,
            "start_time": start_time.strftime('%Y-%m-%d %H:%M:%S'),
            "start_location": {
                "coordinates": location,
                "latitude": lat,
                "longitude": lon,
                "address": address
            }
        }
        
        if field_visit_id:
            response_data['field_visit_id'] = field_visit_id
            response_data['tracking_enabled'] = True
            response_data['tracking_interval'] = '3 minutes'
        
        if tracking_id:
            response_data['initial_tracking_id'] = tracking_id
        
        if destinations_json:
            response_data['destinations'] = json.loads(destinations_json)
        
        message = "Activity started"
        if field_visit_id:
            message += ". GPS tracking enabled every 3 minutes."
        
        return ({
            "success": True,
            "message": message,
            "data": response_data
        }, 201)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Start activity error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def end_activity(activity_id: int, lat: str, lon: str):
    """
    End activity with end location
    
    ✅ ACTIONS:
    - Records end location
    - Calculates duration
    - Ends associated field visit if any
    - Updates tracking statistics
    
    Args:
        activity_id: Activity ID to end
        lat: End latitude
        lon: End longitude
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    location = f"{lat}, {lon}" if lat and lon else ''
    address = get_address_from_coordinates(lat, lon) if lat and lon else ''
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get activity details
        cursor.execute("""
            SELECT * FROM activities
            WHERE id = %s AND status = 'active'
        """, (activity_id,))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Activity not found or already ended"}, 404)
        
        end_time = datetime.now()
        start_time = activity['start_time']
        
        if isinstance(start_time, str):
            start_time = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
        
        duration = int((end_time - start_time).total_seconds() / 60)
        field_visit_id = activity.get('field_visit_id')
        
        # Get tracking points count if field visit exists
        tracking_count = 0
        total_distance = 0
        
        if field_visit_id:
            cursor.execute("""
                SELECT COUNT(*) as count FROM field_visit_tracking
                WHERE field_visit_id = %s
            """, (field_visit_id,))
            
            result = cursor.fetchone()
            tracking_count = result['count'] if result else 0
            
            # End the field visit
            cursor.execute("""
                UPDATE field_visits
                SET 
                    end_time = %s,
                    end_latitude = %s,
                    end_longitude = %s,
                    end_address = %s,
                    duration_minutes = %s,
                    status = 'completed'
                WHERE id = %s
                RETURNING total_distance_km
            """, (end_time, lat, lon, address, duration, field_visit_id))
            
            fv_result = cursor.fetchone()
            total_distance = float(fv_result['total_distance_km'] or 0) if fv_result else 0
            
            logger.info(f"🏢 Field visit ended: ID={field_visit_id}, Distance={total_distance}km")
        
        # Update activity
        cursor.execute("""
            UPDATE activities
            SET 
                end_time = %s, 
                end_location = %s,
                end_address = %s, 
                duration_minutes = %s, 
                status = %s
            WHERE id = %s
        """, (end_time, location, address, duration, 'completed', activity_id))
        
        conn.commit()
        
        logger.info(f"✅ Activity ended: ID={activity_id}, Duration={duration}min")
        
        # Parse coordinates
        start_coords = activity.get('start_location', '').split(', ')
        start_lat = start_coords[0] if len(start_coords) > 0 else ''
        start_lon = start_coords[1] if len(start_coords) > 1 else ''
        
        response_data = {
            "activity_id": activity_id,
            "activity_type": activity['activity_type'],
            "duration_minutes": duration,
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
        
        if field_visit_id:
            response_data['field_visit'] = {
                "id": field_visit_id,
                "tracking_points": tracking_count,
                "total_distance_km": round(total_distance, 2)
            }
        
        # Include destinations if available
        if activity.get('destinations'):
            dests = activity['destinations']
            # Support both JSON string (from DB) and already-parsed list
            if isinstance(dests, str):
                try:
                    response_data['destinations'] = json.loads(dests)
                except Exception:
                    response_data['destinations'] = dests
            else:
                response_data['destinations'] = dests
        
        return ({
            "success": True,
            "message": "Activity ended successfully",
            "data": response_data
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ End activity error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_activities(emp_email: str, limit: int = 50, activity_type: str = None):
    """Get activities with full details including field visit info"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                a.*,
                fv.id as field_visit_id,
                fv.total_distance_km,
                (SELECT COUNT(*) FROM field_visit_tracking 
                 WHERE field_visit_id = fv.id) as tracking_points
            FROM activities a
            LEFT JOIN field_visits fv ON a.field_visit_id = fv.id
            WHERE a.employee_email = %s
        """
        params = [emp_email]
        
        if activity_type:
            query += " AND a.activity_type = %s"
            params.append(activity_type)
        
        query += " ORDER BY a.start_time DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        activities = cursor.fetchall()
        
        # Convert datetime and parse coordinates
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
            "data": {
                "activities": activities, 
                "count": len(activities)
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Get activities error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


# Additional functions remain the same...
# (mark_destination_visited, get_activity_route, start_break, end_break, etc.)

def mark_destination_visited(activity_id: int, destination_sequence: int, lat: str, lon: str):
    """
    Mark a destination as visited (for branch visits)
    
    Args:
        activity_id: Activity ID
        destination_sequence: Sequence number of destination (1, 2, 3, etc.)
        lat: Visited latitude
        lon: Visited longitude
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT destinations, field_visit_id FROM activities
            WHERE id = %s AND status = 'active'
        """, (activity_id,))
        
        result = cursor.fetchone()
        
        if not result or not result['destinations']:
            return ({"success": False, "message": "Activity or destinations not found"}, 404)
        
        destinations = json.loads(result['destinations'])
        field_visit_id = result['field_visit_id']
        
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
        
        # Update activity
        cursor.execute("""
            UPDATE activities
            SET destinations = %s
            WHERE id = %s
        """, (json.dumps(destinations), activity_id))
        
        # Add tracking point if field visit exists
        if field_visit_id and lat and lon:
            cursor.execute("""
                INSERT INTO field_visit_tracking (
                    field_visit_id, latitude, longitude, address, tracking_type
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                field_visit_id, lat, lon,
                get_address_from_coordinates(lat, lon),
                'checkpoint'
            ))
        
        conn.commit()
        
        logger.info(f"✅ Destination marked visited: Activity={activity_id}, Seq={destination_sequence}")
        
        return ({
            "success": True,
            "message": "Destination marked as visited",
            "data": {"destinations": destinations}
        }, 200)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Mark destination visited error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_activity_route(activity_id: int):
    """
    Get complete route with all tracking points for an activity
    
    Args:
        activity_id: Activity ID
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get activity details
        cursor.execute("""
            SELECT a.*, fv.total_distance_km
            FROM activities a
            LEFT JOIN field_visits fv ON a.field_visit_id = fv.id
            WHERE a.id = %s
        """, (activity_id,))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({"success": False, "message": "Activity not found"}, 404)
        
        field_visit_id = activity.get('field_visit_id')
        tracking_points = []
        
        # Get tracking points if field visit exists
        if field_visit_id:
            cursor.execute("""
                SELECT * FROM field_visit_tracking
                WHERE field_visit_id = %s
                ORDER BY tracked_at ASC
            """, (field_visit_id,))
            
            tracking_points = cursor.fetchall()
            
            # Convert datetime
            for point in tracking_points:
                for key, value in point.items():
                    if isinstance(value, datetime):
                        point[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        # Parse coordinates
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
            "total_points": len(tracking_points),
            "total_distance_km": float(activity.get('total_distance_km') or 0)
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
        
    except Exception as e:
        logger.error(f"❌ Get activity route error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def start_break(emp_email: str, emp_name: str, break_type: str):
    """
    Start break (simplified - no location needed)
    
    Args:
        emp_email: Employee email
        emp_name: Employee full name
        break_type: Type of break (meal_break, tea_break, rest_break)
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    valid_break_types = ['meal_break', 'tea_break', 'rest_break']
    if break_type not in valid_break_types:
        return ({
            "success": False,
            "message": f"Invalid break type. Valid types: {', '.join(valid_break_types)}"
        }, 400)
    
    return start_activity(emp_email, emp_name, break_type, '', '', '')


def end_break(break_id: int):
    """
    End break (simplified - no location needed)
    
    Args:
        break_id: Activity ID of the break
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    return end_activity(break_id, '', '')


def get_active_activity(emp_email: str):
    """
    Get currently active activity for an employee
    
    Args:
        emp_email: Employee email
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get active attendance session
        cursor.execute("""
            SELECT id FROM attendance
            WHERE employee_email = %s AND logout_time IS NULL
        """, (emp_email,))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({
                "success": True,
                "data": {
                    "has_active_activity": False,
                    "message": "No active attendance session"
                }
            }, 200)
        
        attendance_id = attendance['id']
        
        # Get active activity
        cursor.execute("""
            SELECT 
                a.*,
                fv.id as field_visit_id,
                fv.total_distance_km,
                (SELECT COUNT(*) FROM field_visit_tracking 
                 WHERE field_visit_id = fv.id) as tracking_points
            FROM activities a
            LEFT JOIN field_visits fv ON a.field_visit_id = fv.id
            WHERE a.attendance_id = %s AND a.status = 'active'
        """, (attendance_id,))
        
        activity = cursor.fetchone()
        
        if not activity:
            return ({
                "success": True,
                "data": {
                    "has_active_activity": False,
                    "message": "No active activity"
                }
            }, 200)
        
        # Convert datetime
        for key, value in activity.items():
            if isinstance(value, datetime):
                activity[key] = value.strftime('%Y-%m-%d %H:%M:%S')
        
        # Parse coordinates
        start_coords = activity.get('start_location', '').split(', ')
        activity['start_lat'] = start_coords[0] if len(start_coords) > 0 else ''
        activity['start_lon'] = start_coords[1] if len(start_coords) > 1 else ''
        
        # Parse destinations
        if activity.get('destinations'):
            try:
                activity['destinations'] = json.loads(activity['destinations'])
            except:
                pass
        
        # Calculate current duration
        start_time = datetime.strptime(activity['start_time'], '%Y-%m-%d %H:%M:%S')
        current_duration = int((datetime.now() - start_time).total_seconds() / 60)
        activity['current_duration_minutes'] = current_duration
        
        return ({
            "success": True,
            "data": {
                "has_active_activity": True,
                "activity": activity
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Get active activity error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_activity_statistics(emp_email: str, start_date: str = None, end_date: str = None):
    """
    Get activity statistics for an employee
    
    Args:
        emp_email: Employee email
        start_date: Start date (YYYY-MM-DD format, optional)
        end_date: End date (YYYY-MM-DD format, optional)
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT 
                activity_type,
                COUNT(*) as count,
                SUM(duration_minutes) as total_duration,
                AVG(duration_minutes) as avg_duration
            FROM activities
            WHERE employee_email = %s AND status = 'completed'
        """
        params = [emp_email]
        
        if start_date:
            query += " AND date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND date <= %s"
            params.append(end_date)
        
        query += " GROUP BY activity_type ORDER BY count DESC"
        
        cursor.execute(query, params)
        stats = cursor.fetchall()
        
        # Convert to proper format
        for stat in stats:
            stat['total_duration'] = float(stat['total_duration'] or 0)
            stat['avg_duration'] = round(float(stat['avg_duration'] or 0), 2)
        
        # Get total field visit distance
        distance_query = """
            SELECT 
                COALESCE(SUM(total_distance_km), 0) as total_distance_km
            FROM field_visits
            WHERE employee_email = %s AND status = 'completed'
        """
        distance_params = [emp_email]
        
        if start_date:
            distance_query += " AND date >= %s"
            distance_params.append(start_date)
        
        if end_date:
            distance_query += " AND date <= %s"
            distance_params.append(end_date)
        
        cursor.execute(distance_query, distance_params)
        distance_result = cursor.fetchone()
        total_distance = float(distance_result['total_distance_km'] or 0)
        
        return ({
            "success": True,
            "data": {
                "statistics": stats,
                "total_field_visits_distance_km": round(total_distance, 2),
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                }
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"❌ Get activity statistics error: {e}")
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()