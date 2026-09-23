"""Administrative API for generic email templates, triggers, and delivery."""
from flask import Blueprint, jsonify, request
from middleware.auth_middleware import token_required
from middleware.admin_middleware import hr_or_devtester_required
from services.email_template_service import DynamicEmailRequest, EmailService, EmailTemplateError, EmailTemplateService
from services.email_trigger_service import AUDIENCES, EMAIL_EVENTS, EmailTriggerService

email_templates_bp = Blueprint("email_templates", __name__)
templates = EmailTemplateService()
email_service = EmailService(templates)
triggers = EmailTriggerService(email_service)

def _result(template):
    return jsonify({"success": True, "data": template})

@email_templates_bp.route("/templates", methods=["GET"])
@token_required
@hr_or_devtester_required
def list_templates(current_user):
    return _result(templates.list())

@email_templates_bp.route("/templates/<template_key>", methods=["GET"])
@token_required
@hr_or_devtester_required
def get_template(current_user, template_key):
    try: return _result(templates.get(template_key, require_active=False))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 404

@email_templates_bp.route("/templates", methods=["POST"])
@token_required
@hr_or_devtester_required
def create_template(current_user):
    try: return _result(templates.create(request.get_json(silent=True) or {})), 201
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400

@email_templates_bp.route("/templates/<template_key>", methods=["PUT"])
@token_required
@hr_or_devtester_required
def update_template(current_user, template_key):
    try: return _result(templates.update(template_key, request.get_json(silent=True) or {}))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400

@email_templates_bp.route("/templates/<template_key>/<state>", methods=["POST"])
@token_required
@hr_or_devtester_required
def set_template_state(current_user, template_key, state):
    if state not in {"enable", "disable"}: return jsonify({"success": False, "message": "state must be enable or disable."}), 400
    try: return _result(templates.set_active(template_key, state == "enable"))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 404

@email_templates_bp.route("/send", methods=["POST"])
@token_required
@hr_or_devtester_required
def send_email(current_user):
    try: return jsonify(email_service.send(DynamicEmailRequest.from_payload(request.get_json(silent=True))))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400
    except RuntimeError as exc: return jsonify({"success": False, "message": str(exc)}), 502


# ---------- Triggers ----------

@email_templates_bp.route("/events", methods=["GET"])
@token_required
@hr_or_devtester_required
def list_events(current_user):
    return _result([{"eventName": name, **meta} for name, meta in sorted(EMAIL_EVENTS.items())])

@email_templates_bp.route("/audiences", methods=["GET"])
@token_required
@hr_or_devtester_required
def list_audiences(current_user):
    return _result([{"audience": name, **meta} for name, meta in AUDIENCES.items()])

@email_templates_bp.route("/triggers", methods=["GET"])
@token_required
@hr_or_devtester_required
def list_triggers(current_user):
    return _result(triggers.list())

@email_templates_bp.route("/triggers", methods=["POST"])
@token_required
@hr_or_devtester_required
def create_trigger(current_user):
    try: return _result(triggers.create(request.get_json(silent=True) or {})), 201
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400

@email_templates_bp.route("/triggers/<trigger_key>", methods=["PUT"])
@token_required
@hr_or_devtester_required
def update_trigger(current_user, trigger_key):
    try: return _result(triggers.update(trigger_key, request.get_json(silent=True) or {}))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400

@email_templates_bp.route("/triggers/<trigger_key>", methods=["DELETE"])
@token_required
@hr_or_devtester_required
def delete_trigger(current_user, trigger_key):
    try: triggers.delete(trigger_key); return jsonify({"success": True})
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 404

@email_templates_bp.route("/triggers/<trigger_key>/<state>", methods=["POST"])
@token_required
@hr_or_devtester_required
def set_trigger_state(current_user, trigger_key, state):
    if state not in {"enable", "disable"}: return jsonify({"success": False, "message": "state must be enable or disable."}), 400
    try: return _result(triggers.set_active(trigger_key, state == "enable"))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 404

@email_templates_bp.route("/triggers/<trigger_key>/run", methods=["POST"])
@token_required
@hr_or_devtester_required
def run_trigger(current_user, trigger_key):
    """Manual trigger: send now. Body may override to/cc/bcc and add variables."""
    body = request.get_json(silent=True) or {}
    try:
        trigger = triggers.get(trigger_key)
        return jsonify(triggers.run(trigger, overrides=body, reference_id=body.get("referenceId")))
    except EmailTemplateError as exc: return jsonify({"success": False, "message": str(exc)}), 400
    except RuntimeError as exc: return jsonify({"success": False, "message": str(exc)}), 502
