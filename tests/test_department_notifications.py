import services.notification_service as notification_service


class DepartmentCursor:
    def __init__(self):
        self.fetchall_value = []

    def execute(self, sql, params=None):
        self.sql = sql
        self.params = params
        if "FROM user_devices ud" not in sql:
            raise AssertionError(f"Unexpected SQL: {sql}")

        department, exclude_1, exclude_2 = params
        assert department == "Sales"
        assert exclude_1 == "EMP001"
        assert exclude_2 == "EMP001"
        self.fetchall_value = [
            {"fcm_token": "token-2"},
            {"fcm_token": "token-3"},
        ]

    def fetchall(self):
        return self.fetchall_value

    def close(self):
        pass


class DepartmentConnection:
    def __init__(self):
        self.cursor_obj = DepartmentCursor()

    def cursor(self):
        return self.cursor_obj


def test_send_push_notification_to_department_excludes_requester(monkeypatch):
    monkeypatch.setattr(notification_service, "get_db_connection", lambda: DepartmentConnection())
    monkeypatch.setattr(notification_service, "return_connection", lambda conn: None)

    captured = {}

    def fake_send(tokens, title, body, data=None, context=None):
        captured["tokens"] = tokens
        captured["title"] = title
        captured["body"] = body
        captured["data"] = data
        captured["context"] = context
        return {"success": True, "sent_count": len(tokens), "failure_count": 0}

    monkeypatch.setattr(notification_service, "_send_push_to_tokens", fake_send)

    result = notification_service.send_push_notification_to_department(
        "Sales",
        "Team Leave Request",
        "Alice submitted a leave request.",
        {"type": "team_leave_submitted", "leave_id": 44},
        exclude_emp_code="EMP001",
    )

    assert result["success"] is True
    assert captured["tokens"] == ["token-2", "token-3"]
    assert captured["title"] == "Team Leave Request"
    assert captured["body"] == "Alice submitted a leave request."
    assert captured["data"]["type"] == "team_leave_submitted"
    assert captured["data"]["leave_id"] == 44
    assert captured["context"]["emp_department"] == "Sales"
    assert captured["context"]["exclude_emp_code"] == "EMP001"

