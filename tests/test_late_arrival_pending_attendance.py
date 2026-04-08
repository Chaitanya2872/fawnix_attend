from datetime import datetime, time

import services.attendance_exceptions_service as exceptions_service
import services.attendance_service as attendance_service


class PendingAttendanceCursor:
    def __init__(self, pending_attendance=None):
        self.fetchone_value = None
        self.inserted_attendance_id = 501
        self.inserted_exception_id = 701
        self.updated_attendance_id = None
        self.pending_attendance = pending_attendance

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM attendance WHERE employee_email = %s AND date = %s AND status IN (%s, %s)" in normalized_sql:
            self.fetchone_value = None
            return

        if "SELECT id FROM attendance_exceptions" in normalized_sql and "exception_type = 'late_arrival'" in normalized_sql:
            self.fetchone_value = None
            return

        if "FROM attendance WHERE employee_email = %s AND date = %s AND status = %s AND logout_time IS NULL" in normalized_sql:
            self.fetchone_value = self.pending_attendance
            return

        if "INSERT INTO attendance (" in normalized_sql and "RETURNING id" in normalized_sql:
            assert params[4] == "pending_clock_in"
            self.fetchone_value = {"id": self.inserted_attendance_id}
            return

        if "INSERT INTO attendance_exceptions (" in normalized_sql and "RETURNING id" in normalized_sql:
            assert params[3] == self.inserted_attendance_id
            self.fetchone_value = {"id": self.inserted_exception_id}
            return

        if "SELECT id, login_time FROM attendance" in normalized_sql and "status = %s" in normalized_sql:
            self.fetchone_value = None
            return

        if "SELECT emp_code FROM employees WHERE emp_email = %s" in normalized_sql:
            self.fetchone_value = {"emp_code": "EMP001"}
            return

        if "UPDATE attendance SET" in normalized_sql:
            self.updated_attendance_id = params[-1]
            self.fetchone_value = None
            return

        if "SELECT COUNT(*) as cnt FROM attendance" in normalized_sql:
            self.fetchone_value = {"cnt": 0}
            return

        if "SELECT COALESCE(is_compoff_session, FALSE) AS is_compoff_session FROM attendance WHERE id = %s" in normalized_sql:
            self.fetchone_value = {"is_compoff_session": False}
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class PendingAttendanceConnection:
    def __init__(self, pending_attendance=None):
        self.cursor_obj = PendingAttendanceCursor(pending_attendance=pending_attendance)
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


def test_request_late_arrival_creates_pending_attendance_id(monkeypatch):
    connection = PendingAttendanceConnection()

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
        "get_employee_shift_times",
        lambda emp_code: (time(10, 0), time(18, 30)),
    )
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 10, 20, 0),
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
    assert result["data"]["attendance_id"] == 501
    assert result["data"]["attendance_status"] == "pending_clock_in"
    assert connection.commit_count == 1


def test_clock_in_reuses_pending_attendance_row(monkeypatch):
    connection = PendingAttendanceConnection(pending_attendance={"id": 501})

    monkeypatch.setattr(attendance_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(attendance_service, "get_address_from_coordinates", lambda lat, lon: "Office")
    monkeypatch.setattr(attendance_service, "is_working_day", lambda work_date, emp_code: (True, "working_day"))
    monkeypatch.setattr(attendance_service, "now_local_naive", lambda: datetime(2026, 4, 8, 10, 25, 0))
    monkeypatch.setattr(attendance_service, "notify_tracking_started", lambda emp_code, attendance_id: None)
    monkeypatch.setattr(
        attendance_service,
        "attach_pending_late_arrival_to_attendance",
        lambda emp_code, attendance_id, login_time: {
            "exception_id": 701,
            "attendance_id": attendance_id,
            "late_by_minutes": 25,
            "already_submitted": True,
        },
    )
    monkeypatch.setattr(attendance_service, "auto_detect_late_arrival", lambda *args, **kwargs: None)

    result, status_code = attendance_service.clock_in(
        "alice@example.com",
        "Alice",
        "9999999999",
        "12.34",
        "56.78",
        "office",
    )

    assert status_code == 201
    assert result["success"] is True
    assert result["data"]["attendance_id"] == 501
    assert connection.cursor_obj.updated_attendance_id == 501
    assert connection.commit_count == 1
