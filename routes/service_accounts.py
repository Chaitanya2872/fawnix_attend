"""
Service Account Routes
Manage API-only service accounts. DevTester (super admin) only.

There is intentionally no DELETE endpoint: an account is revoked instead, which
keeps its audit history intact.
"""

from functools import wraps

from flask import Blueprint, jsonify, request

from middleware.admin_middleware import hr_or_devtester_required
from middleware.auth_middleware import token_required
from services import service_account_service

service_accounts_bp = Blueprint('service_accounts', __name__)


def _devtester_super_admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        designation = (current_user.get("emp_designation") or "").strip().lower()
        if current_user.get("is_service_account") or designation != "devtester":
            return jsonify({
                "success": False,
                "message": "Only DevTester can manage service accounts"
            }), 403
        return f(current_user, *args, **kwargs)
    return decorated


def _request_context():
    return {
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get('User-Agent'),
    }


def _respond(result, status_code, contains_secret=False):
    response = jsonify(result)
    response.status_code = status_code
    if contains_secret:
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Pragma'] = 'no-cache'
    return response


@service_accounts_bp.route('', methods=['GET'], strict_slashes=False)
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def list_service_accounts_route(current_user):
    """GET /api/admin/service-accounts"""
    return _respond(*service_account_service.list_service_accounts())


@service_accounts_bp.route('', methods=['POST'], strict_slashes=False)
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def create_service_account_route(current_user):
    """
    POST /api/admin/service-accounts

    Body: {name, description?, can_read, can_write, can_update, expires_at?}
    The response carries the API key once; it cannot be retrieved again.
    """
    result, status_code = service_account_service.create_service_account(
        request.get_json(silent=True) or {},
        actor=current_user.get('emp_code'),
        **_request_context(),
    )
    return _respond(result, status_code, contains_secret=True)


@service_accounts_bp.route('/<int:service_account_id>', methods=['GET'])
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def get_service_account_route(current_user, service_account_id):
    """GET /api/admin/service-accounts/{id}"""
    return _respond(*service_account_service.get_service_account(service_account_id))


@service_accounts_bp.route('/<int:service_account_id>', methods=['PUT'])
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def update_service_account_route(current_user, service_account_id):
    """
    PUT /api/admin/service-accounts/{id}

    Body (all optional): {name, description, can_read, can_write, can_update, expires_at}
    """
    return _respond(*service_account_service.update_service_account(
        service_account_id,
        request.get_json(silent=True) or {},
        actor=current_user.get('emp_code'),
        **_request_context(),
    ))


@service_accounts_bp.route('/<int:service_account_id>/regenerate-key', methods=['POST'])
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def regenerate_service_account_key_route(current_user, service_account_id):
    """
    POST /api/admin/service-accounts/{id}/regenerate-key

    Body (optional): {expires_at}
    Invalidates the current key immediately and returns the new one once.
    """
    result, status_code = service_account_service.regenerate_api_key(
        service_account_id,
        actor=current_user.get('emp_code'),
        payload=request.get_json(silent=True) or {},
        **_request_context(),
    )
    return _respond(result, status_code, contains_secret=True)


@service_accounts_bp.route('/<int:service_account_id>/revoke', methods=['POST'])
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def revoke_service_account_route(current_user, service_account_id):
    """
    POST /api/admin/service-accounts/{id}/revoke

    Body (optional): {reason}
    """
    payload = request.get_json(silent=True) or {}
    return _respond(*service_account_service.revoke_service_account(
        service_account_id,
        actor=current_user.get('emp_code'),
        reason=payload.get('reason'),
        **_request_context(),
    ))


@service_accounts_bp.route('/<int:service_account_id>/audit-logs', methods=['GET'])
@token_required
@hr_or_devtester_required
@_devtester_super_admin_required
def service_account_audit_logs_route(current_user, service_account_id):
    """GET /api/admin/service-accounts/{id}/audit-logs?limit=&offset="""
    return _respond(*service_account_service.get_service_account_audit_logs(
        service_account_id,
        limit=request.args.get('limit', 100),
        offset=request.args.get('offset', 0),
    ))
