from datetime import date
from decimal import Decimal

import services.employee_master_service as employee_master_service


def test_working_unit_payload_normalizes_new_table_fields():
    config = employee_master_service.RESOURCE_CONFIGS["working-units"]

    payload = {
        "unit_name": "Corporate Office",
        "unit_code": " WU-001 ",
        "address": "",
        "city": "Bengaluru",
        "latitude": "12.971599",
        "longitude": "77.594566",
        "geofence_radius": "0",
        "shift_mapping_id": "42",
        "status": "",
        "created_date": "",
    }

    normalized = employee_master_service._normalize_payload(
        payload,
        config,
        require_required_fields=True,
    )

    assert normalized["unit_code"] == "WU-001"
    assert normalized["address"] is None
    assert normalized["latitude"] == Decimal("12.971599")
    assert normalized["longitude"] == Decimal("77.594566")
    assert normalized["geofence_radius"] == Decimal("0")
    assert normalized["shift_mapping_id"] == 42
    assert normalized["status"] == "active"
    assert "created_date" not in normalized


class EmployeeMasterCursor:
    def __init__(self):
        self.executed = []
        self.fetchone_value = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(str(sql).split())
        self.executed.append((normalized_sql, params))

        if normalized_sql.startswith("SELECT id FROM payroll_units"):
            self.fetchone_value = None
            return

        if normalized_sql.startswith("INSERT INTO payroll_units"):
            self.fetchone_value = {
                "id": 101,
                "unit_name": "Monthly India Payroll",
                "unit_code": "PU-001",
                "pay_group_id": 7,
                "created_by": "ADMIN001",
                "created_date": date(2026, 8, 14),
                "status": "active",
            }
            return

        raise AssertionError(f"Unexpected SQL: {normalized_sql}")

    def fetchone(self):
        return self.fetchone_value

    def close(self):
        pass


class EmployeeMasterConnection:
    def __init__(self):
        self.cursor_obj = EmployeeMasterCursor()
        self.commits = 0
        self.rollbacks = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def test_payroll_unit_create_uses_authenticated_admin_as_created_by(monkeypatch):
    connection = EmployeeMasterConnection()

    monkeypatch.setattr(employee_master_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(employee_master_service, "return_connection", lambda conn: None)

    payload = {
        "unit_name": "Monthly India Payroll",
        "unit_code": "PU-001",
        "pay_group_id": "7",
        "created_by": "",
    }

    response, status_code = employee_master_service.create_master_record(
        "payroll-units",
        payload,
        created_by_emp_code="ADMIN001",
    )

    insert_sql, insert_params = connection.cursor_obj.executed[1]
    assert status_code == 201
    assert response["success"] is True
    assert response["data"]["record"]["created_date"] == "2026-08-14"
    assert "created_by" in insert_sql
    assert "ADMIN001" in insert_params
    assert 7 in insert_params
    assert connection.commits == 1
    assert connection.rollbacks == 0
