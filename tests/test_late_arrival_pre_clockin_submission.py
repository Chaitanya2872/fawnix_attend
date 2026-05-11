from datetime import datetime

import services.attendance_exceptions_service as exceptions_service


class LateArrivalCursor:
    def __init__(self):
        self.fetchone_value = None
        self.inserted_attendance_id = 901
        self.inserted_exception_id = 902
        self.exception_insert_params = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM attendance WHERE employee_email = %s AND date = %s AND status IN (%s, %s)" in normalized_sql:
            self.fetchone_value = None
            return

        if "SELECT id FROM attendance_exceptions" in normalized_sql and "exception_type = 'late_arrival'" in normalized_sql:
            self.fetchone_value = None
            return

        if "FROM attendance WHERE employee_email = %s AND date = %s AND status = %s AND logout_time IS NULL" in normalized_sql:
            self.fetchone_value = None
            return

        if "INSERT INTO attendance (" in normalized_sql and "RETURNING id" in normalized_sql:
            self.fetchone_value = {"id": self.inserted_attendance_id}
            return

        if "INSERT INTO attendance_exceptions (" in normalized_sql and "RETURNING id" in normalized_sql:
            self.exception_insert_params = params
            self.fetchone_value = {"id": self.inserted_exception_id}
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class LateArrivalConnection:
    def __init__(self):
        self.cursor_obj = LateArrivalCursor()
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


def test_request_late_arrival_allows_submission_before_cutoff(monkeypatch):
    connection = LateArrivalConnection()

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
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
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 9, 30, 0),
    )
    monkeypatch.setattr(
        exceptions_service,
        "_exception_time_value",
        lambda cursor, timestamp_value: timestamp_value.time(),
    )

    result, status_code = exceptions_service.request_late_arrival_exception(
        "EMP001",
        "Traffic jam",
        "Heavy rain",
    )

    assert status_code == 201
    assert result["success"] is True
    assert result["data"]["attendance_id"] == 901
    assert result["data"]["late_by_minutes"] == 0
    assert result["data"]["shift_start_time"] == "10:00"
    assert result["data"]["planned_arrival_time"] == "10:00"
    assert connection.cursor_obj.exception_insert_params[8] == 0
    assert connection.commit_count == 1
