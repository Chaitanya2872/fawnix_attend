from datetime import datetime, timedelta, timezone

import services.auth_service as auth_service


class _FakeCursor:
    def __init__(self, row):
        self._row = row
        self.executed = []

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchone(self):
        return self._row

    def close(self):
        return None


class _FakeConn:
    def __init__(self, row):
        self._row = row
        self.cursor_obj = _FakeCursor(row)

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        return None

    def close(self):
        return None

    def rollback(self):
        return None


def test_verify_refresh_token_accepts_timezone_aware_db_expiry(monkeypatch):
    future_expiry = datetime.now(timezone.utc) + timedelta(days=2)
    fake_row = {
        "id": 42,
        "emp_code": "E001",
        "emp_email": "e001@example.com",
        "token_family": "family-123",
        "expires_at": future_expiry,
        "is_revoked": False,
        "revoked_reason": None,
        "use_count": 0,
        "previous_token_id": None,
    }

    monkeypatch.setattr(auth_service, "get_db_connection", lambda: _FakeConn(fake_row))
    monkeypatch.setattr(auth_service, "revoke_token_family", lambda *args, **kwargs: 0)

    result = auth_service.verify_refresh_token("valid-refresh-token")

    assert result["emp_code"] == "E001"
    assert result["token_id"] == 42
