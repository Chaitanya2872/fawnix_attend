"""
Daily Location Report Service
Comprehensive location tracking report for all activities
"""

from datetime import datetime, date
from database.connection import get_db_connection
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


def get_daily_location_report(emp_email: str, report_date: date = None) -> Tuple[Dict, int]:
    """
    Get comprehensive daily location report with all coordinates
    
    Returns:
    - Clock in/out locations
    - All activity start/end locations
    - All field visit tracking points
    - Branch visit destinations
    - Complete timeline with addresses
    
    Args:
        emp_email: Employee email
        report_date: Date for report (default: today)
    """
    if not report_date:
        report_date = date.today()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Get attendance record with locations
        cursor.execute("""
            SELECT 
                id as attendance_id,
                login_time,
                logout_time,
                login_location,
                login_address,
                logout_location,
                logout_address,
                working_hours,
                status
            FROM attendance
            WHERE employee_email = %s AND date = %s
        """, (emp_email, report_date))
        
        attendance = cursor.fetchone()
        
        if not attendance:
            return ({
                "success": False,
                "message": "No attendance record found for this date"
            }, 404)
        
        attendance_id = attendance['attendance_id']
        
        # Parse clock in/out coordinates
        login_coords = attendance.get('login_location', '').split(', ')
        logout_coords = attendance.get('logout_location', '').split(', ') if attendance.get('logout_location') else ['', '']
        
        clock_in_data = {
            "time": attendance['login_time'].strftime('%Y-%m-%d %H:%M:%S') if attendance['login_time'] else None,
            "latitude": login_coords[0] if len(login_coords) > 0 else '',
            "longitude": login_coords[1] if len(login_coords) > 1 else '',
            "address": attendance.get('login_address', ''),
            "type": "clock_in"
        }
        
        clock_out_data = None
        if attendance.get('logout_time'):
            clock_out_data = {
                "time": attendance['logout_time'].strftime('%Y-%m-%d %H:%M:%S'),
                "latitude": logout_coords[0] if len(logout_coords) > 0 else '',
                "longitude": logout_coords[1] if len(logout_coords) > 1 else '',
                "address": attendance.get('logout_address', ''),
                "type": "clock_out"
            }
        
        # 2. Get all activities with locations
        cursor.execute("""
            SELECT 
                id,
                activity_type,
                start_time,
                end_time,
                start_location,
                start_address,
                end_location,
                end_address,
                notes,
                status,
                field_visit_id,
                destinations
            FROM activities
            WHERE attendance_id = %s
            ORDER BY start_time ASC
        """, (attendance_id,))
        
        activities = cursor.fetchall()
        
        # Parse activity locations
        activities_data = []
        for activity in activities:
            start_coords = activity.get('start_location', '').split(', ')
            end_coords = activity.get('end_location', '').split(', ') if activity.get('end_location') else ['', '']
            
            activity_data = {
                "activity_id": activity['id'],
                "activity_type": activity['activity_type'],
                "field_visit_id": activity.get('field_visit_id'),
                "status": activity['status'],
                "notes": activity.get('notes'),
                "start": {
                    "time": activity['start_time'].strftime('%Y-%m-%d %H:%M:%S') if activity['start_time'] else None,
                    "latitude": start_coords[0] if len(start_coords) > 0 else '',
                    "longitude": start_coords[1] if len(start_coords) > 1 else '',
                    "address": activity.get('start_address', '')
                },
                "end": None
            }
            
            if activity.get('end_time'):
                activity_data['end'] = {
                    "time": activity['end_time'].strftime('%Y-%m-%d %H:%M:%S'),
                    "latitude": end_coords[0] if len(end_coords) > 0 else '',
                    "longitude": end_coords[1] if len(end_coords) > 1 else '',
                    "address": activity.get('end_address', '')
                }
            
            # Add destinations if branch visit
            if activity.get('destinations'):
                try:
                    import json
                    destinations = json.loads(activity['destinations'])
                    activity_data['destinations'] = destinations
                except:
                    pass
            
            activities_data.append(activity_data)
        
        # 3. Get field visit tracking points
        cursor.execute("""
            SELECT 
                fvt.id,
                fvt.field_visit_id,
                fvt.latitude,
                fvt.longitude,
                fvt.address,
                fvt.tracked_at,
                fvt.tracking_type,
                fvt.speed_kmh,
                fvt.accuracy_meters,
                fv.visit_type,
                a.activity_type
            FROM field_visit_tracking fvt
            JOIN field_visits fv ON fvt.field_visit_id = fv.id
            LEFT JOIN activities a ON a.field_visit_id = fv.id
            WHERE fv.attendance_id = %s
            ORDER BY fvt.tracked_at ASC
        """, (attendance_id,))
        
        tracking_points = cursor.fetchall()
        
        # Group tracking points by field visit
        tracking_by_visit = {}
        for point in tracking_points:
            visit_id = point['field_visit_id']
            if visit_id not in tracking_by_visit:
                tracking_by_visit[visit_id] = []
            
            tracking_by_visit[visit_id].append({
                "tracking_id": point['id'],
                "time": point['tracked_at'].strftime('%Y-%m-%d %H:%M:%S'),
                "latitude": point['latitude'],
                "longitude": point['longitude'],
                "address": point.get('address', ''),
                "tracking_type": point.get('tracking_type', 'auto'),
                "speed_kmh": float(point['speed_kmh']) if point.get('speed_kmh') else None,
                "accuracy_meters": float(point['accuracy_meters']) if point.get('accuracy_meters') else None
            })
        
        # 4. Build complete timeline
        timeline = []
        
        # Add clock in
        timeline.append(clock_in_data)
        
        # Add all activities with their tracking points
        for activity in activities_data:
            # Add activity start
            timeline.append({
                **activity['start'],
                "type": f"{activity['activity_type']}_start",
                "activity_id": activity['activity_id'],
                "activity_type": activity['activity_type']
            })
            
            # Add tracking points if field visit
            if activity.get('field_visit_id'):
                visit_points = tracking_by_visit.get(activity['field_visit_id'], [])
                for point in visit_points:
                    timeline.append({
                        **point,
                        "type": "tracking_point",
                        "activity_id": activity['activity_id'],
                        "field_visit_id": activity['field_visit_id']
                    })
            
            # Add destinations if branch visit
            if activity.get('destinations'):
                for dest in activity['destinations']:
                    if dest.get('visited'):
                        timeline.append({
                            "time": dest.get('visited_at'),
                            "latitude": dest.get('actual_latitude', dest.get('latitude')),
                            "longitude": dest.get('actual_longitude', dest.get('longitude')),
                            "address": dest.get('actual_address', dest.get('address')),
                            "type": "destination_checkpoint",
                            "activity_id": activity['activity_id'],
                            "destination_name": dest.get('name'),
                            "destination_sequence": dest.get('sequence')
                        })
            
            # Add activity end
            if activity.get('end'):
                timeline.append({
                    **activity['end'],
                    "type": f"{activity['activity_type']}_end",
                    "activity_id": activity['activity_id'],
                    "activity_type": activity['activity_type']
                })
        
        # Add clock out
        if clock_out_data:
            timeline.append(clock_out_data)
        
        # Sort timeline by time
        timeline.sort(key=lambda x: x.get('time', ''))
        
        # 5. Calculate statistics
        total_tracking_points = sum(len(points) for points in tracking_by_visit.values())
        total_activities = len(activities_data)
        total_field_visits = len([a for a in activities_data if a.get('field_visit_id')])
        total_destinations = sum(len(a.get('destinations', [])) for a in activities_data)
        visited_destinations = sum(
            len([d for d in a.get('destinations', []) if d.get('visited')]) 
            for a in activities_data
        )
        
        # Calculate total distance
        cursor.execute("""
            SELECT COALESCE(SUM(total_distance_km), 0) as total_distance
            FROM field_visits
            WHERE attendance_id = %s
        """, (attendance_id,))
        
        distance_result = cursor.fetchone()
        total_distance = float(distance_result['total_distance']) if distance_result else 0
        
        return ({
            "success": True,
            "data": {
                "date": str(report_date),
                "employee_email": emp_email,
                "attendance": {
                    "attendance_id": attendance_id,
                    "clock_in": clock_in_data,
                    "clock_out": clock_out_data,
                    "working_hours": float(attendance['working_hours']) if attendance.get('working_hours') else None,
                    "status": attendance['status']
                },
                "activities": activities_data,
                "tracking_points_by_visit": tracking_by_visit,
                "timeline": timeline,
                "summary": {
                    "total_location_points": len(timeline),
                    "total_activities": total_activities,
                    "total_field_visits": total_field_visits,
                    "total_tracking_points": total_tracking_points,
                    "total_destinations": total_destinations,
                    "visited_destinations": visited_destinations,
                    "total_distance_km": round(total_distance, 2),
                    "has_clock_in": True,
                    "has_clock_out": clock_out_data is not None
                }
            }
        }, 200)
        
    except Exception as e:
        logger.error(f"Daily location report error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return ({"success": False, "message": str(e)}, 500)
    finally:
        cursor.close()
        conn.close()


def get_weekly_location_summary(emp_email: str, week_start: date = None) -> Tuple[Dict, int]:
    """
    Get weekly location summary
    
    Args:
        emp_email: Employee email
        week_start: Start date of week (default: current week Monday)
    """
    from datetime import timedelta
    
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
    
    weekly_data = []
    
    for i in range(7):
        report_date = week_start + timedelta(days=i)
        result, status = get_daily_location_report(emp_email, report_date)
        
        if status == 200:
            weekly_data.append({
                "date": str(report_date),
                "day": report_date.strftime('%A'),
                "summary": result['data']['summary']
            })
    
    return ({
        "success": True,
        "data": {
            "week_start": str(week_start),
            "week_end": str(week_start + timedelta(days=6)),
            "daily_summaries": weekly_data,
            "weekly_totals": {
                "total_days_worked": len([d for d in weekly_data if d['summary']['has_clock_in']]),
                "total_activities": sum(d['summary']['total_activities'] for d in weekly_data),
                "total_distance_km": round(sum(d['summary']['total_distance_km'] for d in weekly_data), 2),
                "total_tracking_points": sum(d['summary']['total_tracking_points'] for d in weekly_data)
            }
        }
    }, 200)