from services import admin_service


class FakeCursor:
    def __init__(self):
        self.executed = []

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchall(self):
        return [
            {
                "id": 1,
                "table_name": "employees",
                "operation": "UPDATE",
                "record_id": "3051",
            }
        ]

    def close(self):
        pass


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_obj = cursor
        self.committed = False
        self.closed = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


def test_database_audit_logs_exclude_api_log_table_before_limit(monkeypatch):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    monkeypatch.setattr(admin_service, "get_db_connection", lambda: connection)

    rows = admin_service.get_database_audit_logs(limit=25)

    assert rows[0]["table_name"] == "employees"
    _, query_params = cursor.executed[-1]
    assert "lower(l.table_name) <> ALL(%s)" in cursor.executed[-1][0]
    assert query_params[0] == ["api_logs"]
    assert query_params[1] == 25
    assert connection.committed is True
    assert connection.closed is True


def test_database_audit_logs_normalize_leave_approval_activity(monkeypatch):
    cursor = FakeCursor()
    cursor.fetchall = lambda: [
        {
            "id": 7,
            "table_name": "leaves",
            "operation": "UPDATE",
            "record_id": "44",
            "changed_fields": ["status", "updated_at"],
            "old_data": {"emp_code": "3051", "leave_type": "casual", "status": "pending"},
            "new_data": {"emp_code": "3051", "leave_type": "casual", "status": "approved", "reviewed_by": "9001"},
            "changed_by": "9001",
            "changed_at": "2026-08-27T10:20:00",
        }
    ]
    monkeypatch.setattr(admin_service, "get_db_connection", lambda: FakeConnection(cursor))

    row = admin_service.get_database_audit_logs(limit=10)[0]

    assert row["action"] == "Approved leave request"
    assert row["module"] == "Leave"
    assert row["record_label"] == "Casual leave for 3051"
    assert row["performed_by"] == "9001"
    assert row["occurred_at"] == "2026-08-27T10:20:00"
    assert row["summary"] == "status changed"


def test_database_audit_logs_normalize_employee_and_permission_activity():
    employee_row = admin_service._build_audit_activity({
        "table_name": "employees",
        "operation": "INSERT",
        "record_id": "3051",
        "changed_fields": ["emp_code", "emp_full_name"],
        "old_data": None,
        "new_data": {"emp_code": "3051", "emp_full_name": "Asha Rao"},
        "changed_by": "9001",
        "changed_at": "2026-08-27T11:00:00",
    })
    permission_row = admin_service._build_audit_activity({
        "table_name": "admin_permissions",
        "operation": "UPDATE",
        "record_id": "3051",
        "changed_fields": ["can_write"],
        "old_data": {"emp_code": "3051", "can_write": False},
        "new_data": {"emp_code": "3051", "can_write": True},
        "changed_by": "8888",
        "changed_at": "2026-08-27T11:10:00",
    })

    assert employee_row["action"] == "Created employee"
    assert employee_row["module"] == "Employee"
    assert employee_row["record_label"] == "Asha Rao (3051)"
    assert permission_row["action"] == "Updated admin permissions"
    assert permission_row["module"] == "Admin Access"
    assert permission_row["record_label"] == "3051"


def test_database_audit_logs_normalize_field_visit_and_master_data_activity():
    field_visit_row = admin_service._build_audit_activity({
        "table_name": "field_visits",
        "operation": "UPDATE",
        "record_id": "12",
        "changed_fields": ["status", "end_time"],
        "old_data": {"purpose": "Client visit", "visit_type": "field_visit", "status": "in_progress"},
        "new_data": {"purpose": "Client visit", "visit_type": "field_visit", "status": "completed"},
        "changed_by": "3051",
        "changed_at": "2026-08-27T12:00:00",
    })
    master_row = admin_service._build_audit_activity({
        "table_name": "departments",
        "operation": "UPDATE",
        "record_id": "9",
        "changed_fields": ["department_head", "updated_at"],
        "old_data": {"department_name": "Support", "department_code": "SUP", "department_head": "1001"},
        "new_data": {"department_name": "Support", "department_code": "SUP", "department_head": "1002"},
        "changed_by": "9001",
        "changed_at": "2026-08-27T12:30:00",
    })

    assert field_visit_row["action"] == "Completed field visit"
    assert field_visit_row["module"] == "Field Visits"
    assert field_visit_row["record_label"] == "Client visit (Field Visit)"
    assert master_row["action"] == "Updated department"
    assert master_row["module"] == "Master Data"
    assert master_row["record_label"] == "Support (SUP)"
    assert master_row["summary"] == "department head changed"


def test_database_audit_logs_normalize_manual_attendance_edit_actor():
    attendance_row = admin_service._build_audit_activity({
        "table_name": "attendance_day_overrides",
        "operation": "UPDATE",
        "record_id": "3051:2026-08-04",
        "changed_fields": ["status", "updated_by_emp_code", "updated_at"],
        "old_data": {"emp_code": "3051", "override_date": "2026-08-04", "status": "A"},
        "new_data": {
            "emp_code": "3051",
            "override_date": "2026-08-04",
            "status": "P",
            "updated_by_emp_code": "8888",
        },
        "changed_by": "postgres",
        "changed_at": "2026-08-27T13:30:00",
    })

    assert attendance_row["action"] == "Edited attendance record"
    assert attendance_row["module"] == "Attendance"
    assert attendance_row["record_label"] == "3051 on 2026-08-04"
    assert attendance_row["performed_by"] == "8888"
