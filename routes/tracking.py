"""
Tracking Routes
Field visit GPS tracking endpoints
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.field_visit_service import (
    track_location, get_active_field_visits, get_tracking_history,
    get_field_visit_summary, get_route_map_data, calculate_visit_statistics
)
from datetime import datetime

tracking_bp = Blueprint('tracking', __name__)


@tracking_bp.route('/track', methods=['POST'])
@token_required
def track(current_user):
    """
    Track location for active field visit
    
    Request Body:
        {
            "field_visit_id": 123,
            "latitude": "17.385044",
            "longitude": "78.486671",
            "speed_kmh": 45.5,           // optional
            "accuracy_meters": 10.5,     // optional
            "tracking_type": "auto"      // auto, manual, checkpoint
        }
    
    Used by:
        - Background scheduler (every 3 minutes)
        - Manual user tracking
        - Checkpoint marking
    """
    data = request.get_json()
    
    field_visit_id = data.get('field_visit_id')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    speed_kmh = data.get('speed_kmh')
    accuracy_meters = data.get('accuracy_meters')
    tracking_type = data.get('tracking_type', 'auto')
    
    if not field_visit_id or not latitude or not longitude:
        return jsonify({
            "success": False,
            "message": "field_visit_id, latitude, and longitude are required"
        }), 400
    
    result = track_location(
        field_visit_id,
        latitude,
        longitude,
        speed_kmh,
        accuracy_meters,
        tracking_type
    )
    
    return jsonify(result[0]), result[1]


@tracking_bp.route('/active', methods=['GET'])
@token_required
def active_visits(current_user):
    """
    Get all active field visits (for scheduler)
    
    Returns list of field visits that need tracking
    """
    result = get_active_field_visits()
    return jsonify(result[0]), result[1]


@tracking_bp.route('/history/<int:field_visit_id>', methods=['GET'])
@token_required
def tracking_history(current_user, field_visit_id):
    """
    Get tracking history for a field visit
    
    Path Params:
        field_visit_id: Field visit ID
    """
    result = get_tracking_history(field_visit_id)
    return jsonify(result[0]), result[1]


@tracking_bp.route('/summary', methods=['GET'])
@token_required
def tracking_summary(current_user):
    """
    Get field visit summary for a date
    
    Query Params:
        date: Date in YYYY-MM-DD format (default: today)
    """
    date_str = request.args.get('date')
    target_date = None
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400
    
    result = get_field_visit_summary(current_user['emp_email'], target_date)
    return jsonify(result[0]), result[1]


@tracking_bp.route('/route/<int:field_visit_id>', methods=['GET'])
@token_required
def route_map(current_user, field_visit_id):
    """
    Get route map data for visualization
    
    Path Params:
        field_visit_id: Field visit ID
    
    Returns data formatted for map rendering
    """
    result = get_route_map_data(field_visit_id)
    return jsonify(result[0]), result[1]


@tracking_bp.route('/statistics/<int:field_visit_id>', methods=['GET'])
@token_required
def visit_statistics(current_user, field_visit_id):
    """
    Get detailed statistics for a field visit
    
    Path Params:
        field_visit_id: Field visit ID
    
    Returns:
        - Total distance
        - Average/max speed
        - Number of stops
        - Duration
    """
    result = calculate_visit_statistics(field_visit_id)
    return jsonify(result[0]), result[1]