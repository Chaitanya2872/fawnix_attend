"""
Organization Holidays API Routes
Handles fetching holiday data for calendar display
"""

from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.leaves_service import get_organization_holidays
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

holidays_bp = Blueprint("holidays", __name__)


@holidays_bp.route("/", methods=["GET"])
@token_required
def get_holidays(current_user):
    """
    Get organization holidays for a specific year
    
    Query Parameters:
        year (int, optional): Year to fetch holidays for. Defaults to current year.
    
    Returns:
        JSON response with holidays list
        
    Example Response:
        {
            "year": 2025,
            "holidays": [
                {
                    "holiday_date": "2025-01-26",
                    "holiday_name": "Republic Day",
                    "weekday": "Sunday"
                },
                ...
            ]
        }
    """
    try:
        # Get year from query parameters, default to current year
        year = request.args.get('year', type=int)
        if not year:
            year = datetime.now().year
        
        # Validate year
        if year < 2000 or year > 2100:
            return jsonify({
                "success": False,
                "message": "Invalid year. Must be between 2000 and 2100"
            }), 400
        
        # Fetch holidays from service
        holidays = get_organization_holidays(year)
        
        return jsonify({
            "year": year,
            "holidays": holidays
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching holidays: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "message": f"Error fetching holidays: {str(e)}"
        }), 500


@holidays_bp.route("/years", methods=["GET"])
@token_required
def get_available_years(current_user):
    """
    Get list of years that have holidays configured
    
    Returns:
        JSON response with list of years
    """
    from database.connection import get_db_connection
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT EXTRACT(YEAR FROM holiday_date) as year
            FROM organization_holidays
            ORDER BY year DESC
        """)
        
        rows = cursor.fetchall()
        years = [int(row['year']) if hasattr(row, 'keys') else int(row[0]) for row in rows]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "years": years,
            "count": len(years)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching available years: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500