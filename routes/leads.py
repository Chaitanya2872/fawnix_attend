"""
Lead Routes
Lead management endpoints with optional field-visit linkage, remarks, and
quotations.
"""

from flask import Blueprint, request, jsonify

from middleware.auth_middleware import token_required_allow_verse
from services.lead_service import (
    create_lead,
    list_leads,
    get_lead,
    update_lead,
    assign_lead,
    update_lead_status,
    add_remark,
    edit_remark,
)
from services.activity_service import get_lead_field_visits, link_field_visit_to_lead
from services import quote_service

leads_bp = Blueprint("leads", __name__)


@leads_bp.route("", methods=["POST"], strict_slashes=False)
@token_required_allow_verse
def create(current_user):
    """Create a lead."""
    payload = request.get_json() or {}
    result, status = create_lead(current_user, payload)
    return jsonify(result), status


@leads_bp.route("", methods=["GET"], strict_slashes=False)
@token_required_allow_verse
def list_all(current_user):
    """List leads with optional filters."""
    filters = request.args.to_dict(flat=True)
    result, status = list_leads(current_user, filters)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>", methods=["GET"])
@token_required_allow_verse
def get_one(current_user, lead_id):
    """Get lead details."""
    result, status = get_lead(lead_id, current_user)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>", methods=["PATCH"])
@token_required_allow_verse
def update(current_user, lead_id):
    """Update lead."""
    payload = request.get_json() or {}
    result, status = update_lead(lead_id, current_user, payload)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/assign", methods=["PATCH"])
@token_required_allow_verse
def assign(current_user, lead_id):
    """Assign or reassign a lead."""
    payload = request.get_json() or {}
    result, status = assign_lead(lead_id, current_user, payload)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/status", methods=["PATCH"])
@token_required_allow_verse
def update_status(current_user, lead_id):
    """Move a lead's pipeline stage (adds a real remark when one is given)."""
    payload = request.get_json() or {}
    result, status = update_lead_status(lead_id, current_user, payload)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/link-field-visit", methods=["POST"])
@token_required_allow_verse
def link_field_visit(current_user, lead_id):
    """Attach an already-started field/branch visit to this lead."""
    payload = request.get_json() or {}
    field_visit_id = payload.get("field_visit_id")
    if field_visit_id in (None, ""):
        return jsonify({"success": False, "message": "field_visit_id is required"}), 400

    try:
        field_visit_id = int(field_visit_id)
    except Exception:
        return jsonify({"success": False, "message": "field_visit_id must be an integer"}), 400

    result, status = link_field_visit_to_lead(current_user["emp_email"], field_visit_id, lead_id)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/field-visits", methods=["GET"])
@token_required_allow_verse
def field_visits(current_user, lead_id):
    """List field/branch visits linked to this lead for the current employee."""
    limit = request.args.get("limit", 50, type=int)
    result, status = get_lead_field_visits(current_user["emp_email"], lead_id, limit)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/remarks", methods=["POST"])
@token_required_allow_verse
def create_remark(current_user, lead_id):
    """Add a remark to a lead (proxied to the CRM service)."""
    payload = request.get_json() or {}
    content = (payload.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "message": "content is required"}), 400

    result, status = add_remark(lead_id, current_user, content)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/remarks/<string:remark_id>", methods=["PATCH"])
@token_required_allow_verse
def update_remark(current_user, lead_id, remark_id):
    """Edit an existing remark version on a lead (proxied to the CRM service)."""
    payload = request.get_json() or {}
    content = (payload.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "message": "content is required"}), 400

    result, status = edit_remark(lead_id, remark_id, current_user, content)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/quotations", methods=["POST"])
@token_required_allow_verse
def create_quotation(current_user, lead_id):
    """Create a quotation for this lead (proxied to sales-service /api/sales/quotes)."""
    payload = request.get_json() or {}
    result, status = quote_service.create_quote_for_lead(lead_id, current_user, payload)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/quotations", methods=["GET"])
@token_required_allow_verse
def list_quotations(current_user, lead_id):
    """List quotations for this lead (proxied to sales-service /api/sales/quotes)."""
    result, status = quote_service.list_quotes_for_lead(lead_id, current_user)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/quotations/<string:quotation_id>", methods=["GET"])
@token_required_allow_verse
def get_quotation(current_user, lead_id, quotation_id):
    """Get a single quotation's detail, including line items."""
    result, status = quote_service.get_quote(quotation_id, current_user)
    return jsonify(result), status


@leads_bp.route("/<string:lead_id>/quotations/<string:quotation_id>", methods=["PATCH"])
@token_required_allow_verse
def update_quotation(current_user, lead_id, quotation_id):
    """Update a quotation's items, totals, status, or notes."""
    payload = request.get_json() or {}
    result, status = quote_service.update_quote(quotation_id, current_user, payload)
    return jsonify(result), status
