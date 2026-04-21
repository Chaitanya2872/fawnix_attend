from datetime import date, datetime, time

import services.attendance_service as attendance_service


class WorkingSaturdayClockOutCursor:
    def __init__(self, shift_end_time):
        self.shift_end_time = shift_end_time
        self.fetchone_value = None
        self.fetchall_value = []
        self.attendance_updates = 0

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "SELECT * FROM attendance" in normalized_sql and "logout_time IS NULL" in normalized_sql:
            self.fetchone_value = {
                "id": 901,
                "employee_name": "Alice",
                "employee_email": "alice@example.com",
                "date": date(2026, 4, 18),
                "login_time": datetime(2026, 4, 18, 10, 0, 0),
                "login_location": "12.34, 56.78",
                "login_address": "Office",
                "attendance_type": "office",
                "status": "logged_in",
                "logout_time": None,
                "working_hours": None,
                "auto_clocked_out": False,
                "is_compoff_session": False,
                "is_compoff": False,
            }
            return

        if "FROM employees e LEFT JOIN shifts s ON s.shift_id = e.emp_shift_id" in normalized_sql:
            self.fetchone_value = {
                "emp_code": "EMP001",
                "emp_shift_id": 10,
                "shift_end_time": self.shift_end_time,
            }
            return

        if "UPDATE activities" in normalized_sql:
            self.fetchall_value = []
            return

        if "UPDATE field_visits" in normalized_sql:
            self.fetchall_value = []
            return

        if "UPDATE attendance" in normalized_sql and "logout_time = %s" in normalized_sql:
            self.attendance_updates += 1
            self.fetchone_value = None
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def fetchall(self):
        return self.fetchall_value

    def close(self):
        pass


class WorkingSaturdayClockOutConnection:
    def __init__(self, shift_end_time):
        self.cursor_obj = WorkingSaturdayClockOutCursor(shift_end_time=shift_end_time)
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


def test_clock_out_skips_early_leave_submission_on_working_saturday_after_130_pm(monkeypatch):
    connection = WorkingSaturdayClockOutConnection(shift_end_time=time(18, 30))

    monkeypatch.setattr(attendance_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(attendance_service, "get_address_from_coordinates", lambda lat, lon: "Office")
    monkeypatch.setattr(
        attendance_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 18, 14, 0, 0),
    )
    monkeypatch.setattr(
        attendance_service,
        "is_working_day",
        lambda work_date, emp_code: (True, "working_saturday"),
    )
    monkeypatch.setattr(
        attendance_service,
        "check_early_leave_approval",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            AssertionError("early leave approval should not be checked on working Saturdays after 13:30")
        ),
    )
    monkeypatch.setattr(attendance_service, "is_flexible_grade_employee", lambda emp_code: False)
    monkeypatch.setattr(attendance_service, "notify_tracking_stopped", lambda emp_code, attendance_id: None)
    monkeypatch.setattr(attendance_service, "calculate_and_record_compoff", lambda **kwargs: None)

    result, status_code = attendance_service.clock_out("alice@example.com", "12.34", "56.78")

    assert status_code == 200
    assert result["success"] is True
    assert result["data"]["attendance_id"] == 901
    assert connection.cursor_obj.attendance_updates == 1
    assert connection.commit_count == 1


def test_clock_out_requires_early_leave_submission_on_working_saturday_before_130_pm(monkeypatch):
    connection = WorkingSaturdayClockOutConnection(shift_end_time=time(18, 30))

    monkeypatch.setattr(attendance_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(attendance_service, "get_address_from_coordinates", lambda lat, lon: "Office")
    monkeypatch.setattr(
        attendance_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 18, 12, 0, 0),
    )
    monkeypatch.setattr(
        attendance_service,
        "is_working_day",
        lambda work_date, emp_code: (True, "working_saturday"),
    )
    monkeypatch.setattr(
        attendance_service,
        "check_early_leave_approval",
        lambda *args, **kwargs: (False, "No early leave request found. Please submit request first."),
    )
    monkeypatch.setattr(attendance_service, "is_flexible_grade_employee", lambda emp_code: False)
    monkeypatch.setattr(attendance_service, "notify_tracking_stopped", lambda emp_code, attendance_id: None)
    monkeypatch.setattr(attendance_service, "calculate_and_record_compoff", lambda **kwargs: None)

    result, status_code = attendance_service.clock_out("alice@example.com", "12.34", "56.78")

    assert status_code == 403
    assert result["success"] is False
    assert "Early clock-out not allowed." in result["message"]
    assert connection.cursor_obj.attendance_updates == 0
    assert connection.commit_count == 0
