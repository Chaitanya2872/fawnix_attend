import services.activity_service as activity_service


class ActivityGuardCursor:
    def __init__(self):
        self.fetchone_value = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "SELECT id FROM attendance WHERE employee_email = %s AND logout_time IS NULL AND status = %s" in normalized_sql:
            self.fetchone_value = None
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class ActivityGuardConnection:
    def __init__(self):
        self.cursor_obj = ActivityGuardCursor()

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def test_start_activity_requires_clock_in(monkeypatch):
    connection = ActivityGuardConnection()

    monkeypatch.setattr(activity_service, "get_db_connection", lambda: connection)

    result, status_code = activity_service.start_activity(
        "alice@example.com",
        "Alice",
        "branch_visit",
        "17.385044",
        "78.486671",
        "Visiting client",
    )

    assert status_code == 400
    assert result["success"] is False
    assert result["message"] == activity_service.CLOCK_IN_REQUIRED_ACTIVITY_MESSAGE


def test_start_break_requires_clock_in(monkeypatch):
    connection = ActivityGuardConnection()

    monkeypatch.setattr(activity_service, "get_db_connection", lambda: connection)

    result, status_code = activity_service.start_break(
        "alice@example.com",
        "Alice",
        "meal_break",
    )

    assert status_code == 400
    assert result["success"] is False
    assert result["message"] == activity_service.CLOCK_IN_REQUIRED_ACTIVITY_MESSAGE
