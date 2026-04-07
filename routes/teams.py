from flask import Blueprint, request, jsonify
import logging
from middleware.auth_middleware import token_required
from services.team_service import create_team, update_team

teams_bp = Blueprint("teams", __name__)
logger = logging.getLogger(__name__)


@teams_bp.route("", methods=["POST"])
@token_required
def create_team_endpoint(current_user):
    """
    Create a new team
    """
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "message": "Request body is required"}), 400

    team_name = data.get("team_name")
    description = data.get("description", "")
    team_lead_id = data.get("team_lead_id")
    members = data.get("members", [])
    created_by = current_user["emp_code"]

    result, status = create_team(team_name, description, team_lead_id, members, created_by)
    return jsonify(result), status


@teams_bp.route("/<int:team_id>", methods=["PUT"])
@token_required
def update_team_endpoint(current_user, team_id):
    """
    Update an existing team
    """
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "message": "Request body is required"}), 400

    team_name = data.get("team_name")
    description = data.get("description", "")
    team_lead_id = data.get("team_lead_id")
    members = data.get("members", [])
    updated_by = current_user["emp_code"]

    result, status = update_team(team_id, team_name, description, team_lead_id, members, updated_by)
    return jsonify(result), status