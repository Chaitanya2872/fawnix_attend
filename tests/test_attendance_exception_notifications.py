from datetime import datetime, time

import services.attendance_exceptions_service as exceptions_service


class NotificationCursor:
    def __init__(self, fetchone_sequence):
        self.fetchone_sequence = list(fetchone_sequence)
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((" ".join(sql.split()), params))

    def fetchone(self):
        if not self.fetchone_sequence:
            return None
        return self.fetchone_sequence.pop(0)

    def close(self):
        pass


class NotificationConnection:
    def __init__(self, fetchone_sequence):
        self.cursor_obj = NotificationCursor(fetchone_sequence)
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


def test_build_exception_notification_payload_uses_actual_late_minutes_and_notes(monkeypatch):
    connection = NotificationConnection([
        {
            "id": 1001,
            "emp_code": "EMP001",
            "emp_name": "Vaishnavi Palepu",
            "attendance_id": 501,
            "exception_type": "late_arrival",
            "exception_date": datetime(2026, 5, 15).date(),
            "exception_time": None,
            "planned_arrival_time": time(9, 0),
            "planned_leave_time": None,
            "late_by_minutes": None,
            "early_by_minutes": None,
            "reason": "Traffic jam",
            "notes": "Personal emergency",
            "status": "pending",
            "manager_code": "M001",
            "manager_email": "manager@example.com",
            "login_time": datetime(2026, 5, 15, 9, 15),
            "logout_time": None,
            "attendance_date": datetime(2026, 5, 15).date(),
            "manager_name": "Raja Shekhar Perepa",
        }
    ])

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_shift_times",
        lambda emp_code: (time(9, 0), time(18, 0)),
    )

    payload = exceptions_service.build_exception_notification_payload(1001)

    assert payload["title"] == "Attendance Exception"
    assert payload["data"]["calculated_minutes"] == 15
    assert payload["data"]["reason"] == "Personal emergency"
    assert payload["data"]["status_label"] == "Pending your review"
    assert "Vaishnavi Palepu has raised a late arrival exception." in payload["body"]
    assert "Late by: 15 minutes" in payload["body"]
    assert "Reason: Personal emergency" in payload["body"]


def test_build_exception_notification_payload_falls_back_to_planned_leave_time(monkeypatch):
    connection = NotificationConnection([
        {
            "id": 1002,
            "emp_code": "EMP002",
            "emp_name": "Prudhvi Sai Chandra Katururi",
            "attendance_id": 502,
            "exception_type": "early_leave",
            "exception_date": datetime(2026, 5, 15).date(),
            "exception_time": None,
            "planned_arrival_time": None,
            "planned_leave_time": time(16, 30),
            "late_by_minutes": None,
            "early_by_minutes": None,
            "reason": "Traffic",
            "notes": "",
            "status": "pending",
            "manager_code": "M001",
            "manager_email": "manager@example.com",
            "login_time": datetime(2026, 5, 15, 9, 0),
            "logout_time": None,
            "attendance_date": datetime(2026, 5, 15).date(),
            "manager_name": "Raja Shekhar Perepa",
        }
    ])

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_shift_times",
        lambda emp_code: (time(9, 0), time(18, 0)),
    )

    payload = exceptions_service.build_exception_notification_payload(1002)

    assert payload["data"]["actual_time"] is None
    assert payload["data"]["selected_time"] == "16:30"
    assert payload["data"]["calculated_minutes"] == 90
    assert payload["data"]["detail"] == "Early by: 90 minutes"
    assert "Reason: Traffic" in payload["body"]


def test_build_exception_notification_payload_reports_missing_time_difference_when_shift_missing(monkeypatch):
    connection = NotificationConnection([
        {
            "id": 1004,
            "emp_code": "EMP004",
            "emp_name": "Vaishnavi Palepu",
            "attendance_id": 503,
            "exception_type": "late_arrival",
            "exception_date": datetime(2026, 5, 15).date(),
            "exception_time": None,
            "planned_arrival_time": time(9, 15),
            "planned_leave_time": None,
            "late_by_minutes": None,
            "early_by_minutes": None,
            "reason": "Traffic jam",
            "notes": "Heavy rain",
            "status": "pending",
            "manager_code": "M001",
            "manager_email": "manager@example.com",
            "login_time": None,
            "logout_time": None,
            "attendance_date": datetime(2026, 5, 15).date(),
            "manager_name": "Raja Shekhar Perepa",
        }
    ])

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_shift_times",
        lambda emp_code: (None, time(18, 0)),
    )
    monkeypatch.setattr(
        exceptions_service,
        "get_late_login_cutoff_time",
        lambda: None,
    )

    payload = exceptions_service.build_exception_notification_payload(1004)

    assert payload["data"]["selected_time"] == "09:15"
    assert payload["data"]["calculated_minutes"] is None
    assert payload["data"]["detail"] == "Late by: Time difference could not be calculated"


def test_sync_early_leave_exception_after_clock_out_updates_actual_minutes(monkeypatch):
    connection = NotificationConnection([
        {
            "id": 1003,
            "emp_code": "EMP003",
            "status": "approved",
            "manager_code": "M001",
            "manager_email": "manager@example.com",
        }
    ])

    monkeypatch.setattr(exceptions_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(
        exceptions_service,
        "get_employee_shift_times",
        lambda emp_code: (time(9, 0), time(18, 0)),
    )
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 5, 15, 18, 5),
    )

    result = exceptions_service.sync_early_leave_exception_after_clock_out(
        502,
        datetime(2026, 5, 15, 17, 40),
    )

    assert result["early_by_minutes"] == 20
    assert connection.commit_count == 1
