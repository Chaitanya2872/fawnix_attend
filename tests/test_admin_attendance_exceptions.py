"""Regression coverage for the admin attendance-exceptions listing."""

import services.attendance_exceptions_service as exceptions_service


class _Cursor:
    def __init__(self):
        self.executed = []
        self._one = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())
        self.executed.append((normalized_sql, params))
        if normalized_sql.startswith("SELECT COUNT(*) AS total_records"):
            self._one = {"total_records": 0}

    def fetchone(self):
        return self._one

    def fetchall(self):
        return []

    def close(self):
        pass


class _Connection:
    def __init__(self):
        self.cursor_obj = _Cursor()

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def test_admin_exceptions_builds_timestamp_from_exception_date_and_time(monkeypatch):
    connection = _Connection()
    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(exceptions_service, "_get_table_columns", lambda *_: {"id"})
    monkeypatch.setattr(exceptions_service, "_build_exception_select", lambda *_args, **_kwargs: "ae.id")

    result, status = exceptions_service.get_admin_attendance_exceptions("ADMIN001")

    assert status == 200
    assert result["success"] is True
    listing_sql = connection.cursor_obj.executed[1][0]
    assert "COALESCE(ae.exception_date, a.date) + ae.exception_time" in listing_sql
    assert "COALESCE(a.login_time, ae.exception_time)" not in listing_sql
