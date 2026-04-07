from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from middleware.auth_middleware import token_required
from services.project_team_service import assign_team_to_project, update_project_team

project_teams_bp = Blueprint("project_teams", __name__)
logger = logging.getLogger(__name__)


@project_teams_bp.route("", methods=["POST"])
@token_required
def assign_team_endpoint(current_user):
    """
    Assign a team to a project
    """
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "message": "Request body is required"}), 400

    project_id = data.get("project_id")
    team_id = data.get("team_id")
    assigned_by = current_user["emp_code"]
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    if not project_id or not isinstance(project_id, int):
        return jsonify({"success": False, "message": "Valid project_id is required"}), 400

    if not team_id or not isinstance(team_id, int):
        return jsonify({"success": False, "message": "Valid team_id is required"}), 400

    if not start_date_str:
        return jsonify({"success": False, "message": "start_date is required"}), 400

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid start_date format. Use YYYY-MM-DD"}), 400

    end_date = None
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid end_date format. Use YYYY-MM-DD"}), 400

    result, status = assign_team_to_project(project_id, team_id, assigned_by, start_date, end_date)
    return jsonify(result), status


@project_teams_bp.route("/<int:project_team_id>", methods=["PUT"])
@token_required
def update_project_team_endpoint(current_user, project_team_id):
    """
    Update a project team assignment
    """
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "message": "Request body is required"}), 400

    team_id = data.get("team_id")
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")
    status = data.get("status")

    start_date = None
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid start_date format. Use YYYY-MM-DD"}), 400

    end_date = None
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid end_date format. Use YYYY-MM-DD"}), 400

    result, status_code = update_project_team(project_team_id, team_id, start_date, end_date, status, current_user["emp_code"])
    return jsonify(result), status_code