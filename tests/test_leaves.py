import pytest
from datetime import date
from services import leaves_service as ls

class MockCursor:
    def __init__(self):
        self._next_fetchone = None
        self._next_fetchall = None
        self.queries = []

    def execute(self, sql, params=None):
        self.queries.append((sql, params))
        if "FROM employees" in sql:
            # Return a valid joining date for the employee
            self._next_fetchone = {'emp_joined_date': date(2020, 1, 1)}
        elif "SELECT leave_type" in sql:
            # Simulate behaviour: if the query counts only approved leaves, return 2.0 used
            # If it were counting pending as well, it would return 3.0. Test ensures only approved counted.
            if "status = 'approved'" in sql or "status = %s" in sql:
                self._next_fetchall = [{'leave_type': 'casual', 'used': 2.0}]
            else:
                self._next_fetchall = [{'leave_type': 'casual', 'used': 3.0}]

    def fetchone(self):
        return self._next_fetchone

    def fetchall(self):
        return self._next_fetchall

    def close(self):
        pass

class MockConn:
    def __init__(self):
        self.cursor_obj = MockCursor()
    def cursor(self):
        return self.cursor_obj
    def close(self):
        pass


def test_balance_counts_only_approved(monkeypatch):
    mock_conn = MockConn()
    monkeypatch.setattr(ls, 'get_db_connection', lambda: mock_conn)

    balance = ls.get_employee_leave_balance('E001')

    assert 'casual' in balance
    assert balance['casual']['used'] == 2.0
    assert balance['casual']['remaining'] == 12 - 2.0
