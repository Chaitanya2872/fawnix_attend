"""
Distance Monitoring Routes
Smart 1km distance checks (only when moving on working days)
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.distance_monitoring_service import (
    check_distance_from_clock_in,
    clear_distance_alert,
    get_distance_alerts
)

distance_bp = Blueprint('distance', __name__)


@distance_bp.route('/check', methods=['POST'])
@token_required
def check_distance(current_user):
    """
    Check if current location exceeds 1km from clock-in location
    
    SMART LOGIC - Only checks if:
    1. It's a working day (not holiday/weekend)
    2. User is moving (speed > 5 km/h or moved > 50m)
    3. User is currently clocked in
    
    Request Body:
        {
            "latitude": "17.385044",   // required
            "longitude": "78.486671",  // required
            "speed_kmh": 25.5          // optional, helps determine if moving
        }
    
    Returns:
        - Distance from clock-in location
        - Whether threshold exceeded (>1km)
        - Alert created if exceeded
        - Skip reasons if not checked
    
    Actions:
        - Auto-creates 'distance_alert' activity if >1km
        - Only ONE alert per attendance session (no duplicates)
    
    Example:
        POST /api/distance/check
        {
            "latitude": "17.440304",
            "longitude": "78.348480",
            "speed_kmh": 45.5
        }
    
    Response Scenarios:
        1. User moving >1km: Alert created
        2. User stationary: No check (returns requires_check: false)
        3. Holiday/weekend: No check (returns requires_check: false)
        4. User moving <1km: OK, no alert
    """
    data = request.get_json()
    
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    speed_kmh = data.get('speed_kmh')
    
    if not latitude or not longitude:
        return jsonify({
            "success": False,
            "message": "latitude and longitude are required"
        }), 400
    
    result = check_distance_from_clock_in(
        current_user['emp_email'],
        latitude,
        longitude,
        speed_kmh
    )
    
    return jsonify(result[0]), result[1]


@distance_bp.route('/alerts', methods=['GET'])
@token_required
def list_alerts(current_user):
    """
    Get all active distance alerts for current user
    
    Returns list of active distance_alert activities
    
    Example:
        GET /api/distance/alerts
    
    Response:
        {
            "success": true,
            "data": {
                "alerts": [
                    {
                        "alert_id": 78,
                        "attendance_id": 123,
                        "start_time": "2025-01-04 10:15:00",
                        "notes": "Employee moved 8.23km from clock-in...",
                        "current_latitude": "17.440304",
                        "current_longitude": "78.348480"
                    }
                ],
                "count": 1
            }
        }
    """
    result = get_distance_alerts(current_user['emp_email'])
    return jsonify(result[0]), result[1]


@distance_bp.route('/clear/<int:attendance_id>', methods=['POST'])
@token_required
def clear_alert(current_user, attendance_id):
    """
    Clear distance alert for attendance session
    
    Called when:
    - User returns within 1km threshold
    - User clocks out (auto-cleared)
    
    Path Params:
        attendance_id: Attendance session ID
    
    Example:
        POST /api/distance/clear/123
    
    Response:
        {
            "success": true,
            "message": "Distance alert cleared",
            "alerts_cleared": 1
        }
    """
    result = clear_distance_alert(attendance_id)
    return jsonify(result[0]), result[1]


# ==========================================
# REGISTER IN MAIN APP
# ==========================================
"""
In your main app.py:

from routes.distance_monitoring_routes import distance_bp
app.register_blueprint(distance_bp, url_prefix='/api/distance')

USAGE:
Call /api/distance/check during field visit tracking (every 3 minutes)
Backend automatically determines if check is needed based on:
- Working day status
- User movement status
No manual filtering required on frontend!
"""