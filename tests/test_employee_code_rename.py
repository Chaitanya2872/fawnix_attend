import services.user_management_service as user_management_service
from services.user_management_service import update_employee


class FakeCursor:
    """Minimal cursor that answers the queries update_employee issues."""

    def __init__(self, existing_codes, foreign_key_columns=(), named_columns=()):
        self.existing_codes = set(existing_codes)
        self.foreign_key_columns = list(foreign_key_columns)
        self.named_columns = list(named_columns)
        self.fetch_results = []
        self.statements = []
        self.rowcount = 0

    def execute(self, query, params=None):
        # Rename statements arrive as psycopg2 sql.Composed objects, whose str()
        # is a repr rather than the rendered statement.
        normalized = " ".join(str(query).split())
        self.statements.append((normalized, params))
        self.rowcount = 0

        if normalized.startswith("SELECT * FROM employees WHERE emp_code"):
            self.fetch_results = [{
                "emp_code": params[0],
                "emp_full_name": "Asha R",
                "emp_email": "asha@x.com",
            }]
        elif normalized.startswith("SELECT 1 FROM employees WHERE emp_code") or \
                normalized.startswith("SELECT 1 FROM users WHERE emp_code"):
            self.fetch_results = [{"?column?": 1}] if params[0] in self.existing_codes else []
        elif "FROM pg_constraint con" in normalized:
            self.fetch_results = [
                {"table_name": table, "column_name": column}
                for table, column in self.foreign_key_columns
            ]
        elif "FROM information_schema.columns c" in normalized:
            self.fetch_results = [
                {"table_name": table, "column_name": column}
                for table, column in self.named_columns
            ]
        elif "INSERT INTO employees" in normalized or "DELETE FROM employees" in normalized:
            self.fetch_results = []
            self.rowcount = 1
        elif "UPDATE" in normalized:
            self.fetch_results = [{"emp_code": "9001", "emp_full_name": "Asha R"}]
            self.rowcount = 1
        else:
            self.fetch_results = []

    def fetchone(self):
        return self.fetch_results[0] if self.fetch_results else None

    def fetchall(self):
        return list(self.fetch_results)

    def close(self):
        pass

    def statement_kinds(self):
        """Sequence of INSERT/UPDATE/DELETE statements, in execution order."""
        kinds = []
        for statement, _params in self.statements:
            for keyword in ("INSERT INTO employees", "DELETE FROM employees", "UPDATE"):
                if keyword in statement:
                    kinds.append(keyword)
                    break
        return kinds


class FakeConnection:
    def __init__(self, cursor_obj):
        self.cursor_obj = cursor_obj
        self.commits = 0
        self.rollbacks = 0
        self.autocommit = True

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def _patch_connection(monkeypatch, cursor):
    connection = FakeConnection(cursor)
    monkeypatch.setattr(user_management_service, "get_db_connection", lambda: connection)
    monkeypatch.setattr(user_management_service, "return_connection", lambda conn: None)
    monkeypatch.setattr(
        user_management_service,
        "_get_employee_columns",
        lambda cursor_arg: {"emp_code": {}, "emp_full_name": {}, "emp_email": {}},
    )
    return connection


def test_rename_moves_foreign_keys_and_plain_columns(monkeypatch):
    cursor = FakeCursor(
        existing_codes={"3051"},
        foreign_key_columns=[
            ("attendance_tracking_notification_state", "emp_code"),
            ("leaves", "emp_code"),
            ("users", "emp_code"),
        ],
        named_columns=[
            ("attendance_day_overrides", "emp_code"),
            ("employees", "emp_code"),
            ("employees", "emp_manager"),
            ("leaves", "manager_code"),
        ],
    )
    connection = _patch_connection(monkeypatch, cursor)

    result, status_code = update_employee("3051", {"emp_code": "9001"})

    assert status_code == 200
    assert result["success"] is True
    assert result["emp_code_renamed"]["from"] == "3051"
    assert result["emp_code_renamed"]["to"] == "9001"
    assert connection.commits == 1

    moved = set(result["emp_code_renamed"]["updated_references"])
    assert moved == {
        "attendance_day_overrides.emp_code",
        "attendance_tracking_notification_state.emp_code",
        "employees.emp_code",
        "employees.emp_manager",
        "leaves.emp_code",
        "leaves.manager_code",
        "users.emp_code",
    }


def test_rename_clones_before_repointing_and_deletes_last(monkeypatch):
    """
    Foreign keys onto employees(emp_code) are NO ACTION and non-deferrable, so
    the new row must exist before any child moves, and the old row must go last.
    """
    cursor = FakeCursor(
        existing_codes={"3051"},
        foreign_key_columns=[("users", "emp_code")],
        named_columns=[("employees", "emp_code")],
    )
    _patch_connection(monkeypatch, cursor)

    update_employee("3051", {"emp_code": "9001"})

    kinds = cursor.statement_kinds()
    assert kinds[0] == "INSERT INTO employees"
    assert kinds[-1] == "DELETE FROM employees"
    assert "UPDATE" in kinds[1:-1]


def test_rename_does_not_touch_the_employees_primary_key_directly(monkeypatch):
    cursor = FakeCursor(
        existing_codes={"3051"},
        named_columns=[("employees", "emp_code")],
    )
    _patch_connection(monkeypatch, cursor)

    update_employee("3051", {"emp_code": "9001"})

    assert not any(
        "UPDATE" in statement and "employees" in statement and "emp_code" in statement
        and "INSERT" not in statement and "DELETE" not in statement
        and params == ("9001", "3051")
        for statement, params in cursor.statements
    )


def test_rename_rejects_code_already_in_use(monkeypatch):
    cursor = FakeCursor(existing_codes={"3051", "9001"})
    connection = _patch_connection(monkeypatch, cursor)

    result, status_code = update_employee("3051", {"emp_code": "9001"})

    assert status_code == 409
    assert result["success"] is False
    assert connection.commits == 0
    assert connection.rollbacks == 1


def test_rename_rejects_malformed_code(monkeypatch):
    cursor = FakeCursor(existing_codes={"3051"})
    connection = _patch_connection(monkeypatch, cursor)

    result, status_code = update_employee("3051", {"emp_code": "not a code"})

    assert status_code == 400
    assert result["success"] is False
    assert connection.commits == 0


def test_rename_reports_constraint_failures_instead_of_a_blank_500(monkeypatch):
    import psycopg2

    cursor = FakeCursor(existing_codes={"3051"}, named_columns=[("leaves", "emp_code")])
    connection = _patch_connection(monkeypatch, cursor)

    def explode(cursor_arg, old_code, new_code):
        raise psycopg2.IntegrityError('insert or update on table "leaves" violates foreign key constraint')

    monkeypatch.setattr(user_management_service, "_rename_employee_code", explode)

    result, status_code = update_employee("3051", {"emp_code": "9001"})

    assert status_code == 409
    assert "Could not change the Employee ID" in result["message"]
    assert "violates foreign key constraint" in result["message"]
    assert connection.commits == 0


def test_unchanged_code_is_not_treated_as_a_rename(monkeypatch):
    cursor = FakeCursor(existing_codes={"3051"})
    _patch_connection(monkeypatch, cursor)

    result, status_code = update_employee("3051", {"emp_code": "3051", "emp_full_name": "Asha Rao"})

    assert status_code == 200
    assert "emp_code_renamed" not in result


def test_audit_tables_are_excluded_from_rename():
    assert "database_audit_logs" in user_management_service.EMPLOYEE_CODE_RENAME_EXCLUDED_TABLES
    assert "api_logs" in user_management_service.EMPLOYEE_CODE_RENAME_EXCLUDED_TABLES
