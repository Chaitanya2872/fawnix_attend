from datetime import datetime, time

import services.attendance_exceptions_service as exceptions_service


class EarlyLeaveCursor:
    def __init__(self):
        self.fetchone_value = None
        self.inserted_exception_id = 801
        self.insert_params = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM attendance WHERE id = %s AND employee_email = %s" in normalized_sql:
            self.fetchone_value = {
                "id": params[0],
                "employee_email": params[1],
                "date": datetime(2026, 4, 8).date(),
                "logout_time": None,
            }
            return

        if "SELECT id, status FROM attendance_exceptions WHERE attendance_id = %s AND exception_type = 'early_leave' ORDER BY requested_at DESC, id DESC LIMIT 1" in normalized_sql:
            self.fetchone_value = None
            return

        if "INSERT INTO attendance_exceptions (" in normalized_sql and "RETURNING id" in normalized_sql:
            self.insert_params = params
            self.fetchone_value = {"id": self.inserted_exception_id}
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class EarlyLeaveConnection:
    def __init__(self):
        self.cursor_obj = EarlyLeaveCursor()
        self.commit_count = 0
        self.rollback_count = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commit_count += 1

    def rollback(self):
        self.rollback_count += 1

    def close(self):
        pass


def _patch_common_dependencies(monkeypatch, connection):
    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(exceptions_service, "is_flexible_grade_employee", lambda emp_code: False)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_and_manager_info",
        lambda emp_code: {
            "emp_code": emp_code,
            "emp_name": "Alice",
            "emp_email": "alice@example.com",
            "approver_code": "M001",
            "approver_email": "manager@example.com",
            "approver_name": "Manager",
        },
    )
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_shift_times",
        lambda emp_code: (time(10, 0), time(18, 30)),
    )


def test_request_early_leave_rejects_planned_time_before_window(monkeypatch):
    connection = EarlyLeaveConnection()
    _patch_common_dependencies(monkeypatch, connection)
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 11, 0, 0),
    )

    result, status_code = exceptions_service.request_early_leave_exception(
        "EMP001",
        45,
        "15:00",
        "Medical emergency",
        "Doctor appointment",
    )

    assert status_code == 400
    assert result["success"] is False
    assert result["message"] == "Planned leave time must be between 16:00 and 18:30"
    assert connection.commit_count == 0


def test_request_early_leave_allows_submission_anytime_when_planned_time_is_valid(monkeypatch):
    connection = EarlyLeaveConnection()
    _patch_common_dependencies(monkeypatch, connection)
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 11, 0, 0),
    )

    result, status_code = exceptions_service.request_early_leave_exception(
        "EMP001",
        45,
        "16:30",
        "Medical emergency",
        "Doctor appointment",
    )

    assert status_code == 201
    assert result["success"] is True
    assert result["data"]["planned_leave_time"] == "16:30"
    assert result["data"]["early_by_minutes"] is None
    assert connection.commit_count == 1


def test_request_early_leave_allows_flexible_grade_employee_submission(monkeypatch):
    connection = EarlyLeaveConnection()
    _patch_common_dependencies(monkeypatch, connection)
    monkeypatch.setattr(exceptions_service, "is_flexible_grade_employee", lambda emp_code: True)
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 11, 0, 0),
    )

    result, status_code = exceptions_service.request_early_leave_exception(
        "EMP001",
        45,
        "16:30",
        "Medical emergency",
        "Doctor appointment",
    )

    assert status_code == 201
    assert result["success"] is True
    assert result["data"]["planned_leave_time"] == "16:30"
    assert connection.commit_count == 1
