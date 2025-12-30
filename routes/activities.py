"""
Activity Routes
Activity and break management endpoints
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.activity_service import (
    start_activity, end_activity, get_activities,
    mark_destination_visited, get_activity_route,
    start_break, end_break
)

activities_bp = Blueprint('activities', __name__)


@activities_bp.route('/start', methods=['POST'])
@token_required
def start(current_user):
    """
    Start activity
    
    Request Body:
        {
            "activity_type": "branch_visit",  // required
            "latitude": "17.385044",          // required for field visits
            "longitude": "78.486671",         // required for field visits
            "notes": "Visiting client",       // optional
            "destinations": [                 // optional, for branch visits
                {
                    "name": "Branch Office",
                    "lat": "17.385044",
                    "lon": "78.486671",
                    "address": "Optional address"
                }
            ]
        }
    
    Activity Types:
        - branch_visit
        - late_arrival
        - early_leave
        - meal_break
        - tea_break
        - rest_break
    
    Guards:
        - Must be clocked in
        - Only one active activity allowed
    """
    data = request.get_json()
    
    activity_type = data.get('activity_type')
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    notes = data.get('notes', '')
    destinations = data.get('destinations')
    
    if not activity_type:
        return jsonify({
            "success": False,
            "message": "activity_type is required"
        }), 400
    
    result = start_activity(
        current_user['emp_email'],
        current_user['emp_full_name'],
        activity_type,
        latitude,
        longitude,
        notes,
        destinations
    )
    
    return jsonify(result[0]), result[1]


@activities_bp.route('/end', methods=['POST'])
@token_required
def end(current_user):
    """
    End activity
    
    Request Body:
        {
            "activity_id": 123,              // required
            "latitude": "17.385044",         // optional
            "longitude": "78.486671"         // optional
        }
    
    Actions:
        - Records end location
        - Calculates duration
        - Ends associated field visit
    """
    data = request.get_json()
    activity_id = data.get('activity_id')
    
    if not activity_id:
        return jsonify({
            "success": False,
            "message": "activity_id is required"
        }), 400
    
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    
    result = end_activity(activity_id, latitude, longitude)
    return jsonify(result[0]), result[1]


@activities_bp.route('', methods=['GET'], strict_slashes=False)
@token_required
def list_activities(current_user):
    """
    List activities
    
    Query Params:
        limit: Number of records (default: 50)
        type: Filter by activity type (optional)
    """
    limit = request.args.get('limit', 50, type=int)
    activity_type = request.args.get('type')
    
    result = get_activities(current_user['emp_email'], limit, activity_type)
    return jsonify(result[0]), result[1]


@activities_bp.route('/route/<int:activity_id>', methods=['GET'])
@token_required
def activity_route(current_user, activity_id):
    """
    Get complete route with all tracking points
    
    Path Params:
        activity_id: Activity ID
    """
    result = get_activity_route(activity_id)
    return jsonify(result[0]), result[1]


@activities_bp.route('/destination/visit', methods=['POST'])
@token_required
def visit_destination(current_user):
    """
    Mark destination as visited (for branch visits)
    
    Request Body:
        {
            "activity_id": 123,
            "destination_sequence": 1,
            "latitude": "17.385044",
            "longitude": "78.486671"
        }
    """
    data = request.get_json()
    
    activity_id = data.get('activity_id')
    destination_sequence = data.get('destination_sequence')
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    
    if not activity_id or not destination_sequence:
        return jsonify({
            "success": False,
            "message": "activity_id and destination_sequence are required"
        }), 400
    
    result = mark_destination_visited(
        activity_id, 
        destination_sequence, 
        latitude, 
        longitude
    )
    return jsonify(result[0]), result[1]


@activities_bp.route('/break/start', methods=['POST'])
@token_required
def start_break_route(current_user):
    """
    Start break
    
    Request Body:
        {
            "break_type": "meal_break"  // meal_break, tea_break, rest_break
        }
    """
    data = request.get_json()
    break_type = data.get('break_type')
    
    if not break_type:
        return jsonify({
            "success": False,
            "message": "break_type is required"
        }), 400
    
    result = start_break(
        current_user['emp_email'],
        current_user['emp_full_name'],
        break_type
    )
    
    return jsonify(result[0]), result[1]


@activities_bp.route('/break/end', methods=['POST'])
@token_required
def end_break_route(current_user):
    """
    End break
    
    Request Body:
        {
            "break_id": 123  // activity_id of the break
        }
    """
    data = request.get_json()
    break_id = data.get('break_id')
    
    if not break_id:
        return jsonify({
            "success": False,
            "message": "break_id is required"
        }), 400
    
    result = end_break(break_id)
    return jsonify(result[0]), result[1]