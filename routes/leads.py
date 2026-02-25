"""
Lead Routes
Lead management endpoints with optional field-visit linkage.
"""

from flask import Blueprint, request, jsonify

from middleware.auth_middleware import token_required
from services.lead_service import (
    create_lead,
    list_leads,
    get_lead,
    update_lead,
    link_lead_field_visit,
)

leads_bp = Blueprint("leads", __name__)


@leads_bp.route("", methods=["POST"], strict_slashes=False)
@token_required
def create(current_user):
    """Create a lead."""
    payload = request.get_json() or {}
    result, status = create_lead(current_user, payload)
    return jsonify(result), status


@leads_bp.route("", methods=["GET"], strict_slashes=False)
@token_required
def list_all(current_user):
    """List leads with optional filters."""
    filters = {
        "status": request.args.get("status"),
        "priority": request.args.get("priority"),
        "search": request.args.get("search"),
        "scope": request.args.get("scope", "my"),
        "field_visit_id": request.args.get("field_visit_id"),
        "limit": request.args.get("limit", 50),
        "offset": request.args.get("offset", 0),
    }
    result, status = list_leads(current_user, filters)
    return jsonify(result), status


@leads_bp.route("/<int:lead_id>", methods=["GET"])
@token_required
def get_one(current_user, lead_id):
    """Get lead details."""
    result, status = get_lead(lead_id, current_user)
    return jsonify(result), status


@leads_bp.route("/<int:lead_id>", methods=["PUT"])
@token_required
def update(current_user, lead_id):
    """Update lead."""
    payload = request.get_json() or {}
    result, status = update_lead(lead_id, current_user, payload)
    return jsonify(result), status


@leads_bp.route("/<int:lead_id>/link-field-visit", methods=["POST"])
@token_required
def link_field_visit(current_user, lead_id):
    """Link lead to an existing field visit."""
    payload = request.get_json() or {}
    field_visit_id = payload.get("field_visit_id")
    if field_visit_id in (None, ""):
        return jsonify({"success": False, "message": "field_visit_id is required"}), 400

    try:
        field_visit_id = int(field_visit_id)
    except Exception:
        return jsonify({"success": False, "message": "field_visit_id must be an integer"}), 400

    result, status = link_lead_field_visit(lead_id, field_visit_id, current_user)
    return jsonify(result), status
