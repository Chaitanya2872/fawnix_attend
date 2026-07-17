from datetime import datetime, time

import services.admin_service as admin_service


class AdminAttendanceHistoryCursor:
    def __init__(self, attendance_rows):
        self.attendance_rows = attendance_rows
        self.fetchone_value = None
        self.fetchall_value = []
        self.executed = []

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())
        self.executed.append((normalized_sql, params))

        if normalized_sql.startswith("SELECT COUNT(*) AS total_records"):
            self.fetchone_value = {"total_records": len(self.attendance_rows)}
            return

        if "SUM(" in normalized_sql and "AS late_logins" in normalized_sql:
            self.fetchone_value = {
                "late_logins": 0,
                "on_time_logins": len(self.attendance_rows),
                "logged_out_count": 1,
                "late_exception_count": 0,
            }
            return

        if "SELECT a.*, e.emp_code, e.emp_designation" in normalized_sql:
            self.fetchall_value = list(self.attendance_rows)
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def fetchall(self):
        return self.fetchall_value

    def close(self):
        pass


class AdminAttendanceHistoryConnection:
    def __init__(self, attendance_rows):
        self.cursor_obj = AdminAttendanceHistoryCursor(attendance_rows)

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def test_get_all_attendance_history_attaches_early_leave_metadata(monkeypatch):
    attendance_rows = [
        {
            "id": 101,
            "date": datetime(2026, 7, 17).date(),
            "employee_email": "early@example.com",
            "employee_name": "Early Employee",
            "login_time": datetime(2026, 7, 17, 9, 15),
            "logout_time": datetime(2026, 7, 17, 16, 30),
            "working_hours": 7.25,
            "status": "logged_out",
            "attendance_type": "office",
            "emp_code": "EMP101",
            "emp_designation": "Engineer",
            "shift_start_time": time(9, 0),
            "shift_end_time": time(18, 0),
        },
        {
            "id": 102,
            "date": datetime(2026, 7, 17).date(),
            "employee_email": "planned@example.com",
            "employee_name": "Planned Employee",
            "login_time": datetime(2026, 7, 17, 9, 0),
            "logout_time": None,
            "working_hours": None,
            "status": "logged_in",
            "attendance_type": "office",
            "emp_code": "EMP102",
            "emp_designation": "Designer",
            "shift_start_time": time(9, 0),
            "shift_end_time": time(18, 0),
        },
    ]
    connection = AdminAttendanceHistoryConnection(attendance_rows)

    def fake_fetch_exception_rows(_cursor, attendance_ids, exception_type):
        assert attendance_ids == [101, 102]
        if exception_type == "early_leave":
            return {
                102: {
                    "attendance_id": 102,
                    "status": "pending",
                    "planned_leave_time": time(16, 0),
                    "early_by_minutes": 120,
                    "reason": "Medical appointment",
                    "requested_at": datetime(2026, 7, 17, 14, 0),
                    "reviewed_at": None,
                }
            }
        return {}

    monkeypatch.setattr(admin_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(admin_service, "_fetch_exception_rows_by_attendance_ids", fake_fetch_exception_rows)
    monkeypatch.setattr(admin_service, "get_late_login_cutoff_time", lambda: time(10, 0))

    response, status_code = admin_service.get_all_attendance_history(page_size=100)

    assert status_code == 200
    records = response["data"]["records"]

    actual_early_leave = records[0]["early_leave"]
    assert actual_early_leave["is_early_departure"] is True
    assert actual_early_leave["requested"] is False
    assert actual_early_leave["status"] == "not_requested"
    assert actual_early_leave["actual_logout_time"] == "16:30"
    assert actual_early_leave["early_by_minutes"] == 90

    requested_early_leave = records[1]["early_leave"]
    assert requested_early_leave["is_early_departure"] is False
    assert requested_early_leave["requested"] is True
    assert requested_early_leave["status"] == "pending"
    assert requested_early_leave["planned_leave_time"] == "16:00"
    assert requested_early_leave["early_by_minutes"] == 120
    assert requested_early_leave["reason"] == "Medical appointment"
