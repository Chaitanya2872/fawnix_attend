from datetime import date, datetime, time

import services.attendance_exceptions_service as exceptions_service


class ExceptionHistoryCursor:
    def __init__(self, attendance_rows):
        self.attendance_rows = attendance_rows
        self.last_sql = ""
        self.last_params = None

    def execute(self, sql, params=None):
        self.last_sql = " ".join(sql.split())
        self.last_params = params

    def fetchall(self):
        if "FROM attendance" in self.last_sql:
            return self.attendance_rows
        raise AssertionError(f"Unexpected fetchall SQL: {self.last_sql}")

    def close(self):
        pass


class ExceptionHistoryConnection:
    def __init__(self, attendance_rows):
        self.cursor_obj = ExceptionHistoryCursor(attendance_rows)

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def test_get_my_late_arrival_records_uses_pending_clock_in_status_constant(monkeypatch):
    attendance_rows = [
        {
            "id": 45,
            "date": date(2026, 5, 26),
            "login_time": datetime(2026, 5, 26, 10, 25, 0),
        }
    ]
    connection = ExceptionHistoryConnection(attendance_rows)

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_and_manager_info",
        lambda emp_code: {"emp_email": "alice@example.com"},
    )
    monkeypatch.setattr(exceptions_service, "_get_late_reference_time", lambda emp_code: time(10, 0))
    monkeypatch.setattr(
        exceptions_service,
        "_fetch_exception_rows_by_attendance_ids",
        lambda cursor, attendance_ids, exception_type: {},
    )

    result, status_code = exceptions_service.get_my_late_arrival_records("EMP001")

    assert status_code == 200
    assert result["success"] is True
    assert result["data"]["count"] == 1
    assert result["data"]["exceptions"][0]["status"] == "not_requested"
    assert connection.cursor_obj.last_params == ("alice@example.com", exceptions_service.ATTENDANCE_STATUS_PENDING_CLOCK_IN)


def test_get_my_early_leave_records_uses_pending_clock_in_status_constant(monkeypatch):
    attendance_rows = [
        {
            "id": 78,
            "date": date(2026, 5, 26),
            "login_time": datetime(2026, 5, 26, 10, 0, 0),
            "logout_time": datetime(2026, 5, 26, 16, 20, 0),
        }
    ]
    connection = ExceptionHistoryConnection(attendance_rows)

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_and_manager_info",
        lambda emp_code: {"emp_email": "alice@example.com"},
    )
    monkeypatch.setattr(exceptions_service, "get_employee_shift_times", lambda emp_code: (time(10, 0), time(18, 30)))
    monkeypatch.setattr(
        exceptions_service,
        "_fetch_exception_rows_by_attendance_ids",
        lambda cursor, attendance_ids, exception_type: {},
    )

    result, status_code = exceptions_service.get_my_early_leave_records("EMP001")

    assert status_code == 200
    assert result["success"] is True
    assert result["data"]["count"] == 1
    assert result["data"]["exceptions"][0]["status"] == "not_requested"
    assert connection.cursor_obj.last_params == ("alice@example.com", exceptions_service.ATTENDANCE_STATUS_PENDING_CLOCK_IN)
