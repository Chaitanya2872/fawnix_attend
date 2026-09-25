from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify

import middleware.auth_middleware as auth_middleware
import services.api_log_service as api_log_service
import services.service_account_service as sa_service
from middleware.admin_middleware import hr_or_devtester_required
from routes.service_accounts import service_accounts_bp


class _FakeCursor:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.executed = []

    def execute(self, query, params=None):
        self.executed.append((" ".join(query.split()), params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None

    def fetchall(self):
        rows, self.rows = self.rows, []
        return rows

    def close(self):
        return None


class _FakeConn:
    def __init__(self, rows=None):
        self.cursor_obj = _FakeCursor(rows)
        self.committed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        return None

    def close(self):
        return None


def _account_row(api_key, **overrides):
    row = {
        "id": 7,
        "name": "ERP sync",
        "key_id": sa_service.parse_api_key(api_key),
        "key_hash": sa_service.hash_api_key(api_key),
        "can_read": True,
        "can_write": False,
        "can_update": False,
        "status": "active",
        "expires_at": None,
        "last_used_at": None,
    }
    row.update(overrides)
    return row


def _patch_db(monkeypatch, conn):
    monkeypatch.setattr(sa_service, "get_db_connection", lambda: conn)
    monkeypatch.setattr(sa_service, "return_connection", lambda _conn: None)


# ---------------------------------------------------------------------------
# Keys
# ---------------------------------------------------------------------------

def test_generated_key_format_and_hash():
    key_id, api_key, key_hash = sa_service.generate_api_key()

    assert api_key.startswith(f"fxsa_{key_id}_")
    assert len(api_key.split("_", 2)[2]) >= 64
    assert sa_service.parse_api_key(api_key) == key_id
    assert key_hash == sa_service.hash_api_key(api_key)
    assert api_key not in key_hash


def test_generated_keys_are_unique():
    keys = {sa_service.generate_api_key()[1] for _ in range(50)}
    assert len(keys) == 50


def test_parse_rejects_malformed_keys():
    assert sa_service.parse_api_key("fxsa_short_secret") is None
    assert sa_service.parse_api_key("eyJhbGciOiJIUzI1NiJ9.payload.sig") is None
    assert sa_service.parse_api_key(None) is None


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_valid_key_resolves_to_service_account_user(monkeypatch):
    _, api_key, _ = sa_service.generate_api_key()
    conn = _FakeConn([_account_row(api_key, can_update=True)])
    _patch_db(monkeypatch, conn)

    user, error = sa_service.authenticate_api_key(api_key, "10.0.0.1")

    assert error is None
    assert user["is_service_account"] is True
    assert user["emp_code"] == f"SA:{sa_service.parse_api_key(api_key)}"
    assert user["emp_designation"] == "service_account"
    assert user["role"] == "admin"
    assert user["can_read"] is True
    assert user["can_update"] is True
    assert user["can_create"] is False


def test_tampered_key_is_rejected_and_audited(monkeypatch):
    _, api_key, _ = sa_service.generate_api_key()
    conn = _FakeConn([_account_row(api_key)])
    _patch_db(monkeypatch, conn)

    tampered = api_key[:-1] + ("A" if api_key[-1] != "A" else "B")
    user, error = sa_service.authenticate_api_key(tampered)

    assert user is None
    assert error == ({"success": False, "message": "Invalid token"}, 401)
    assert any("auth_failed" in str(params) for _, params in conn.cursor_obj.executed)


def test_revoked_account_is_rejected(monkeypatch):
    _, api_key, _ = sa_service.generate_api_key()
    _patch_db(monkeypatch, _FakeConn([_account_row(api_key, status="revoked")]))

    user, error = sa_service.authenticate_api_key(api_key)

    assert user is None
    assert error[1] == 401


def test_expired_account_is_rejected(monkeypatch):
    _, api_key, _ = sa_service.generate_api_key()
    expired = datetime.now(timezone.utc) - timedelta(minutes=1)
    _patch_db(monkeypatch, _FakeConn([_account_row(api_key, expires_at=expired)]))

    user, error = sa_service.authenticate_api_key(api_key)

    assert user is None
    assert error[1] == 401


def test_regenerated_key_invalidates_old_key(monkeypatch):
    _, old_key, _ = sa_service.generate_api_key()
    _, new_key, _ = sa_service.generate_api_key()
    # After regeneration the row holds the new key id/hash; the old id no longer matches.
    _patch_db(monkeypatch, _FakeConn([]))

    user, error = sa_service.authenticate_api_key(old_key)
    assert user is None and error[1] == 401

    _patch_db(monkeypatch, _FakeConn([_account_row(new_key)]))
    user, error = sa_service.authenticate_api_key(new_key)
    assert error is None and user["is_service_account"]


# ---------------------------------------------------------------------------
# Request gate
# ---------------------------------------------------------------------------

def _user(read=False, write=False, update=False):
    return {
        "is_service_account": True,
        "can_read": read,
        "can_create": write,
        "can_write": write or update,
        "can_update": update,
    }


def test_method_permissions_are_enforced():
    check = sa_service.check_service_account_request

    assert check(_user(read=True), "GET", "/api/admin/employees") is None
    assert check(_user(write=True), "GET", "/api/admin/employees")[1] == 403

    assert check(_user(write=True), "POST", "/api/leads") is None
    assert check(_user(read=True, update=True), "POST", "/api/leads")[1] == 403

    assert check(_user(update=True), "PUT", "/api/leads/1") is None
    assert check(_user(update=True), "PATCH", "/api/leads/1") is None
    assert check(_user(read=True, write=True), "PUT", "/api/leads/1")[1] == 403


def test_delete_is_always_denied():
    everything = _user(read=True, write=True, update=True)
    for path in ("/api/users/E001", "/api/admin/overtime-records/1", "/api/leads/1"):
        body, status = sa_service.check_service_account_request(everything, "DELETE", path)
        assert status == 403
        assert "delete" in body["message"].lower()


def test_privilege_endpoints_are_blocked():
    everything = _user(read=True, write=True, update=True)
    check = sa_service.check_service_account_request

    assert check(everything, "POST", "/api/auth/refresh")[1] == 403
    assert check(everything, "GET", "/api/auth/sessions")[1] == 403
    assert check(everything, "POST", "/api/admin/admins")[1] == 403
    assert check(everything, "PUT", "/api/admin/admins/E1/permissions")[1] == 403
    assert check(everything, "GET", "/api/admin/service-accounts")[1] == 403
    assert check(everything, "GET", "/api/admin/api-logs")[1] == 403
    assert check(everything, "POST", "/api/users")[1] == 403
    assert check(everything, "PUT", "/api/users/E001")[1] == 403
    assert check(everything, "GET", "/api/users/E001") is None
    # Prefix matching must not catch unrelated paths.
    assert check(everything, "GET", "/api/admin/adminsx") is None


def test_service_account_passes_existing_admin_write_check_only_with_flags():
    app = Flask(__name__)

    @hr_or_devtester_required
    def write_route(current_user):
        return jsonify({"success": True}), 200

    with app.test_request_context("/api/admin/x", method="PUT"):
        assert write_route(_user(update=True) | {"role": "admin"})[1] == 200
        assert write_route(_user(read=True) | {"role": "admin"})[1] == 403


# ---------------------------------------------------------------------------
# Middleware integration
# ---------------------------------------------------------------------------

def _app_with_protected_routes():
    app = Flask(__name__)

    @app.route("/api/admin/things", methods=["GET", "POST", "PUT", "DELETE"])
    @auth_middleware.token_required
    def things(current_user):
        return jsonify({"emp_code": current_user["emp_code"]}), 200

    return app


def test_token_required_accepts_api_key_and_applies_gate(monkeypatch):
    _, api_key, _ = sa_service.generate_api_key()
    events = []

    def fake_authenticate(token, ip_address=None, user_agent=None):
        assert token == api_key
        row = _account_row(api_key)
        return sa_service._build_current_user(row), None

    monkeypatch.setattr(auth_middleware, "authenticate_api_key", fake_authenticate)
    monkeypatch.setattr(auth_middleware, "log_service_account_event", lambda *a, **k: events.append((a, k)))
    monkeypatch.setattr(auth_middleware, "decode_jwt_token", lambda _t: (_ for _ in ()).throw(AssertionError("JWT path used")))

    client = _app_with_protected_routes().test_client()
    headers = {"Authorization": f"Bearer {api_key}"}

    ok = client.get("/api/admin/things", headers=headers)
    assert ok.status_code == 200
    assert ok.get_json()["emp_code"].startswith("SA:")

    assert client.post("/api/admin/things", headers=headers).status_code == 403
    assert client.delete("/api/admin/things", headers=headers).status_code == 403
    assert [args[1] for args, _ in events] == ["access_denied", "access_denied"]


def test_token_required_rejects_invalid_api_key(monkeypatch):
    monkeypatch.setattr(
        auth_middleware,
        "authenticate_api_key",
        lambda *a, **k: (None, ({"success": False, "message": "Invalid token"}, 401)),
    )
    client = _app_with_protected_routes().test_client()

    response = client.get("/api/admin/things", headers={"Authorization": "Bearer fxsa_bogus"})

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Management routes
# ---------------------------------------------------------------------------

def _management_app(monkeypatch, current_user):
    import routes.service_accounts as routes_module

    def fake_token_required(f):
        from functools import wraps

        @wraps(f)
        def decorated(*args, **kwargs):
            return f(current_user, *args, **kwargs)
        return decorated

    # Rebuild the route functions around a fake auth decorator.
    app = Flask(__name__)
    wrapped = routes_module._devtester_super_admin_required(
        lambda cu: jsonify({"success": True}),
    )
    app.add_url_rule("/probe", "probe", fake_token_required(hr_or_devtester_required(wrapped)))
    return app


def test_management_requires_devtester(monkeypatch):
    admin = {"emp_designation": "HR", "role": "admin", "can_read": True, "can_write": True}
    devtester = {"emp_designation": "DevTester", "role": "employee"}
    service_account = _user(read=True, write=True, update=True) | {
        "role": "admin", "emp_designation": "service_account",
    }

    assert _management_app(monkeypatch, admin).test_client().get("/probe").status_code == 403
    assert _management_app(monkeypatch, service_account).test_client().get("/probe").status_code == 403
    assert _management_app(monkeypatch, devtester).test_client().get("/probe").status_code == 200


def test_blueprint_has_no_delete_routes():
    app = Flask(__name__)
    app.register_blueprint(service_accounts_bp, url_prefix="/api/admin/service-accounts")
    methods = {m for rule in app.url_map.iter_rules() if rule.rule.startswith("/api/admin/service-accounts") for m in rule.methods}
    assert "DELETE" not in methods


def test_create_returns_key_once_and_stores_only_hash(monkeypatch):
    created_row = {"id": 1, "name": "ERP", "key_id": "0" * 16}
    conn = _FakeConn([None, created_row])
    _patch_db(monkeypatch, conn)

    result, status = sa_service.create_service_account(
        {"name": "ERP", "can_read": True, "can_update": True}, actor="DEV1",
    )

    assert status == 201
    api_key = result["data"]["api_key"]
    insert_params = next(params for query, params in conn.cursor_obj.executed if query.startswith("INSERT INTO service_accounts"))
    assert api_key not in insert_params
    assert sa_service.hash_api_key(api_key) in insert_params
    assert "key_hash" not in result["data"]["service_account"]


def test_create_validates_permissions_and_delete(monkeypatch):
    _patch_db(monkeypatch, _FakeConn())

    assert sa_service.create_service_account({"name": "X"}, actor="DEV1")[1] == 400
    assert sa_service.create_service_account({"name": "X", "can_read": True, "can_delete": True}, actor="DEV1")[1] == 400
    assert sa_service.create_service_account({"name": "", "can_read": True}, actor="DEV1")[1] == 400
    assert sa_service.create_service_account(
        {"name": "X", "can_read": True, "expires_at": "2000-01-01"}, actor="DEV1",
    )[1] == 400


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def test_api_log_sanitizer_redacts_api_keys():
    _, api_key, _ = sa_service.generate_api_key()
    payload = {"data": {"api_key": api_key, "note": f"use {api_key}"}, "keys": [api_key]}

    sanitized = api_log_service.sanitize_payload(payload)

    assert api_key not in str(sanitized)


def test_logging_middleware_records_key_id_not_key():
    from middleware.logging_middleware import _extract_emp_code_from_request

    _, api_key, _ = sa_service.generate_api_key()
    app = Flask(__name__)
    with app.test_request_context("/api/x", headers={"Authorization": f"Bearer {api_key}"}):
        emp_code = _extract_emp_code_from_request()

    assert emp_code == f"SA:{sa_service.parse_api_key(api_key)}"
