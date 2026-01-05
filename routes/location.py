"""
Location Report Routes
Daily and weekly location tracking reports
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.daily_location_report_service import (
    get_daily_location_report,
    get_weekly_location_summary
)
from datetime import datetime

location_report_bp = Blueprint('location_report', __name__)


@location_report_bp.route('/daily', methods=['GET'])
@token_required
def daily_report(current_user):
    """
    Get comprehensive daily location report
    
    Query Params:
        date: Date in YYYY-MM-DD format (default: today)
    
    Returns complete timeline with all coordinates:
    - Clock in/out locations
    - Activity start/end locations
    - Field visit tracking points (every 3 minutes)
    - Branch visit destinations
    - Complete addresses for each location
    
    Example:
        GET /api/reports/daily?date=2025-01-04
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
    
    result = get_daily_location_report(current_user['emp_email'], target_date)
    return jsonify(result[0]), result[1]


@location_report_bp.route('/weekly', methods=['GET'])
@token_required
def weekly_report(current_user):
    """
    Get weekly location summary
    
    Query Params:
        week_start: Week start date in YYYY-MM-DD format (default: current week Monday)
    
    Returns daily summaries for entire week
    
    Example:
        GET /api/reports/weekly?week_start=2025-01-06
    """
    week_start_str = request.args.get('week_start')
    week_start = None
    
    if week_start_str:
        try:
            week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
        except:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Use YYYY-MM-DD"
            }), 400
    
    result = get_weekly_location_summary(current_user['emp_email'], week_start)
    return jsonify(result[0]), result[1]


# ==========================================
# REGISTER IN MAIN APP
# ==========================================
"""
In your main app.py:

from routes.location_report_routes import location_report_bp
app.register_blueprint(location_report_bp, url_prefix='/api/reports')
"""