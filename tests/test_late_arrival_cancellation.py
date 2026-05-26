from datetime import datetime, time

import services.attendance_exceptions_service as exceptions_service


class LateArrivalCancelCursor:
    def __init__(self, *, existing_status="pending"):
        self.fetchone_value = None
        self.existing_status = existing_status
        self.update_params = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())

        if "FROM attendance_exceptions WHERE id = %s AND exception_type = 'late_arrival' AND emp_code = %s AND emp_email = %s LIMIT 1" in normalized_sql:
            if self.existing_status is None:
                self.fetchone_value = None
            else:
                self.fetchone_value = {
                    "id": params[0],
                    "attendance_id": None,
                    "exception_type": "late_arrival",
                    "status": self.existing_status,
                    "emp_code": params[1],
                    "emp_email": params[2],
                    "planned_arrival_time": time(10, 15),
                    "late_by_minutes": 25,
                    "manager_code": "M001",
                    "manager_email": "manager@example.com",
                }
            return

        if "UPDATE attendance_exceptions SET status = %s, updated_at = %s, manager_remarks = %s WHERE id = %s" in normalized_sql:
            self.update_params = params
            self.fetchone_value = None
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class LateArrivalCancelConnection:
    def __init__(self, *, existing_status="pending"):
        self.cursor_obj = LateArrivalCancelCursor(existing_status=existing_status)
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


def test_cancel_late_arrival_allows_owner_to_cancel_pending_request(monkeypatch):
    connection = LateArrivalCancelConnection(existing_status="pending")
    _patch_common_dependencies(monkeypatch, connection)
    monkeypatch.setattr(
        exceptions_service,
        "now_local_naive",
        lambda: datetime(2026, 4, 8, 9, 40, 0),
    )

    result, status_code = exceptions_service.cancel_late_arrival_exception("EMP001", 12)

    assert status_code == 200
    assert result["success"] is True
    assert result["data"]["status"] == "cancelled"
    assert result["data"]["planned_arrival_time"] == "10:15"
    assert connection.cursor_obj.update_params[0] == "cancelled"
    assert connection.commit_count == 1


def test_cancel_late_arrival_rejects_non_pending_request(monkeypatch):
    connection = LateArrivalCancelConnection(existing_status="approved")
    _patch_common_dependencies(monkeypatch, connection)

    result, status_code = exceptions_service.cancel_late_arrival_exception("EMP001", 12)

    assert status_code == 400
    assert result["success"] is False
    assert "Only pending late arrival requests can be cancelled" in result["message"]
    assert connection.commit_count == 0
