from datetime import datetime, time

import services.attendance_exceptions_service as exceptions_service


class EarlyLeaveCancelCursor:
    def __init__(self, *, existing_status="pending", allow_resubmit_after_cancel=False):
        self.fetchone_value = None
        self.existing_status = existing_status
        self.allow_resubmit_after_cancel = allow_resubmit_after_cancel
        self.inserted_exception_id = 901
        self.update_params = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM attendance_exceptions WHERE id = %s AND exception_type = 'early_leave' AND emp_code = %s AND emp_email = %s LIMIT 1" in normalized_sql:
            if self.existing_status is None:
                self.fetchone_value = None
            else:
                self.fetchone_value = {
                    "id": params[0],
                    "attendance_id": 45,
                    "exception_type": "early_leave",
                    "status": self.existing_status,
                    "emp_code": params[1],
                    "emp_email": params[2],
                    "planned_leave_time": time(16, 30),
                    "early_by_minutes": 120,
                    "manager_code": "M001",
                    "manager_email": "manager@example.com",
                }
            return

        if "UPDATE attendance_exceptions SET status = %s, updated_at = %s, manager_remarks = %s WHERE id = %s" in normalized_sql:
            self.update_params = params
            self.fetchone_value = None
            return

        if "FROM attendance WHERE id = %s AND employee_email = %s" in normalized_sql:
            self.fetchone_value = {
                "id": params[0],
                "employee_email": params[1],
                "date": datetime(2026, 4, 8).date(),
                "logout_time": None,
            }
            return

        if "SELECT id, status FROM attendance_exceptions WHERE attendance_id = %s AND exception_type = 'early_leave' ORDER BY requested_at DESC, id DESC LIMIT 1" in normalized_sql:
            self.fetchone_value = {"id": 77, "status": "cancelled"} if self.allow_resubmit_after_cancel else None
            return

        if "INSERT INTO attendance_exceptions (" in normalized_sql and "RETURNING id" in normalized_sql:
            self.fetchone_value = {"id": self.inserted_exception_id}
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class EarlyLeaveCancelConnection:
    def __init__(self, *, existing_status="pending", allow_resubmit_after_cancel=False):
        self.cursor_obj = EarlyLeaveCancelCursor(
            existing_status=existing_status,
            allow_resubmit_after_cancel=allow_resubmit_after_cancel,
        )
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


def test_cancel_early_leave_allows_owner_to_cancel_pending_request(monkeypatch):
    connection = EarlyLeaveCancelConnection(existing_status="pending")
    _patch_common_dependencies(monkeypatch, connection)
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 12, 15, 0),
    )

    result, status_code = exceptions_service.cancel_early_leave_exception("EMP001", 13)

    assert status_code == 200
    assert result["success"] is True
    assert result["data"]["status"] == "cancelled"
    assert connection.cursor_obj.update_params[0] == "cancelled"
    assert connection.commit_count == 1


def test_cancel_early_leave_rejects_non_pending_request(monkeypatch):
    connection = EarlyLeaveCancelConnection(existing_status="approved")
    _patch_common_dependencies(monkeypatch, connection)

    result, status_code = exceptions_service.cancel_early_leave_exception("EMP001", 13)

    assert status_code == 400
    assert result["success"] is False
    assert "Only pending early leave requests can be cancelled" in result["message"]
    assert connection.commit_count == 0


def test_request_early_leave_allows_resubmit_after_cancel(monkeypatch):
    connection = EarlyLeaveCancelConnection(allow_resubmit_after_cancel=True)
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
    assert result["data"]["status"] == "pending"
    assert connection.commit_count == 1
