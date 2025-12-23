"""
Activities Routes
Activity and break management endpoints
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.activity_service import (
    start_activity, end_activity, get_activities,
    start_break, end_break
)

activities_bp = Blueprint('activities', __name__)


@activities_bp.route('/start', methods=['POST'])
@token_required
def start(current_user):
    """Start activity"""
    data = request.get_json()
    
    activity_type = data.get('activity_type')
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    notes = data.get('notes', '')
    
    result = start_activity(
        current_user['emp_email'],
        current_user['emp_full_name'],
        activity_type,
        latitude,
        longitude,
        notes
    )
    
    return jsonify(result[0]), result[1]


@activities_bp.route('/end', methods=['POST'])
@token_required
def end(current_user):
    """End activity"""
    data = request.get_json()
    activity_id = data.get('activity_id')
    
    latitude = data.get('latitude', '')
    longitude = data.get('longitude', '')
    
    result = end_activity(activity_id, latitude, longitude)
    return jsonify(result[0]), result[1]


# ✅ FIXED: Changed '/' to '' and added strict_slashes=False
@activities_bp.route('', methods=['GET'], strict_slashes=False)
@token_required
def list_activities(current_user):
    """List activities"""
    limit = request.args.get('limit', 50, type=int)
    activity_type = request.args.get('type')
    
    result = get_activities(current_user['emp_email'], limit, activity_type)
    return jsonify(result[0]), result[1]


@activities_bp.route('/break/start', methods=['POST'])
@token_required
def start_break_route(current_user):
    """Start break"""
    data = request.get_json()
    break_type = data.get('break_type')
    
    result = start_break(
        current_user['emp_email'],
        current_user['emp_full_name'],
        break_type
    )
    
    return jsonify(result[0]), result[1]


@activities_bp.route('/break/end', methods=['POST'])
@token_required
def end_break_route(current_user):
    """End break"""
    data = request.get_json()
    break_id = data.get('break_id')
    
    result = end_break(break_id)
    return jsonify(result[0]), result[1]