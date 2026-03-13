from datetime import datetime

import pytest
from flask import Flask

import middleware.auth_middleware as auth_middleware
import routes.devices as devices_routes
import services.notification_service as notification_service
from routes.devices import devices_bp


def create_test_app():
    app = Flask(__name__)
    app.register_blueprint(devices_bp, url_prefix="/api/devices")
    return app


class AuthCursor:
    def __init__(self, user_row):
        self.user_row = user_row

    def execute(self, sql, params=None):
        self.sql = sql
        self.params = params

    def fetchone(self):
        return self.user_row

    def close(self):
        pass


class AuthConnection:
    def __init__(self, user_row):
        self.cursor_obj = AuthCursor(user_row)

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def authenticate_request(monkeypatch, user_row, payload=None):
    monkeypatch.setattr(
        auth_middleware,
        "decode_jwt_token",
        lambda token: payload or {"sub": user_row.get("emp_code", "E001")},
    )
    monkeypatch.setattr(
        auth_middleware,
        "get_db_connection",
        lambda: AuthConnection(user_row),
    )


def test_register_uses_jwt_derived_identity(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
            "emp_full_name": "Employee One",
            "emp_email": "e001@example.com",
            "emp_designation": "Engineer",
            "emp_manager": "M001",
        },
    )

    captured = {}

    def fake_register_device(**kwargs):
        captured.update(kwargs)
        return (
            {
                "success": True,
                "message": "Device token registered successfully",
                "data": {"id": 1, "user_id": kwargs["user_id"], "emp_code": kwargs["emp_code"]},
            },
            200,
        )

    monkeypatch.setattr(devices_routes, "register_device", fake_register_device)

    response = client.post(
        "/api/devices/register",
        headers={"Authorization": "Bearer test-token"},
        json={
            "user_id": 999,
            "fcm_token": "token-1",
            "platform": "android",
            "device_name": "Android Device",
            "emp_code": "1001",
        },
    )

    assert response.status_code == 200
    assert captured["user_id"] == 7
    assert captured["emp_code"] == "E001"
    assert captured["fcm_token"] == "token-1"
    assert captured["platform"] == "android"
    assert captured["device_name"] == "Android Device"


def test_register_missing_auth_returns_401():
    app = create_test_app()
    client = app.test_client()

    response = client.post(
        "/api/devices/register",
        json={"fcm_token": "token-1", "platform": "android", "device_name": "Android Device"},
    )

    assert response.status_code == 401
    assert response.get_json()["message"] == "Token required"


def test_register_invalid_current_user_id_returns_400(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "user_id": "abc",
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
            "emp_full_name": "Employee One",
            "emp_email": "e001@example.com",
            "emp_designation": "Engineer",
            "emp_manager": "M001",
        },
    )

    monkeypatch.setattr(
        devices_routes,
        "register_device",
        lambda **kwargs: pytest.fail("register_device should not be called"),
    )

    response = client.post(
        "/api/devices/register",
        headers={"Authorization": "Bearer test-token"},
        json={"user_id": 999, "fcm_token": "token-1", "platform": "android"},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Authenticated user does not contain a valid numeric user id"


def test_register_missing_current_user_id_returns_400(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
            "emp_full_name": "Employee One",
            "emp_email": "e001@example.com",
            "emp_designation": "Engineer",
            "emp_manager": "M001",
        },
    )

    monkeypatch.setattr(
        devices_routes,
        "register_device",
        lambda **kwargs: pytest.fail("register_device should not be called"),
    )

    response = client.post(
        "/api/devices/register",
        headers={"Authorization": "Bearer test-token"},
        json={"fcm_token": "token-1", "platform": "android"},
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Authenticated user does not contain a valid numeric user id"


class DeviceCursor:
    def __init__(self, store):
        self.store = store
        self.fetchone_value = None

    def execute(self, sql, params=None):
        if "INSERT INTO user_devices" in sql:
            user_id, emp_code, token, platform, device_name = params
            existing = self.store.get(token)
            now = datetime.utcnow()
            if existing:
                row = dict(existing)
                row["user_id"] = user_id
                row["emp_code"] = emp_code
                row["platform"] = platform
                row["device_name"] = device_name
                row["is_active"] = True
                row["updated_at"] = now
            else:
                row = {
                    "id": len(self.store) + 1,
                    "user_id": user_id,
                    "emp_code": emp_code,
                    "platform": platform,
                    "device_name": device_name,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                }
            self.store[token] = row
            self.fetchone_value = dict(row)
        else:
            raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class DeviceConnection:
    def __init__(self, store):
        self.cursor_obj = DeviceCursor(store)

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        pass

    def rollback(self):
        pass


def test_register_device_upserts_same_fcm_token(monkeypatch):
    store = {}

    monkeypatch.setattr(notification_service, "get_db_connection", lambda: DeviceConnection(store))
    monkeypatch.setattr(notification_service, "return_connection", lambda conn: None)

    first_result, first_status = notification_service.register_device(
        user_id=1,
        fcm_token="same-token",
        platform="android",
        device_name="Pixel",
        emp_code="E001",
    )
    second_result, second_status = notification_service.register_device(
        user_id=2,
        fcm_token="same-token",
        platform="ios",
        device_name="iPhone",
        emp_code="E002",
    )

    assert first_status == 200
    assert second_status == 200
    assert first_result["success"] is True
    assert second_result["success"] is True
    assert second_result["data"]["user_id"] == 2
    assert second_result["data"]["emp_code"] == "E002"
    assert second_result["data"]["platform"] == "ios"
    assert second_result["data"]["device_name"] == "iPhone"
