from database import connection as db_connection


class FakeCursor:
    def __init__(self, executed):
        self.executed = executed

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, params=None):
        self.executed.append((query, params))


class FakeConnection:
    def __init__(self):
        self.executed = []
        self.commits = 0
        self.rollbacks = 0

    def cursor(self):
        return FakeCursor(self.executed)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def test_no_actor_is_stamped_outside_a_request(monkeypatch):
    """Schedulers and scripts have no authenticated user to attribute to."""
    conn = FakeConnection()

    db_connection._stamp_audit_actor(conn)

    assert conn.executed == []
    assert getattr(conn, db_connection._AUDIT_ACTOR_FLAG, None) is None


def test_request_actor_is_published_to_the_audit_trigger(monkeypatch):
    monkeypatch.setattr(db_connection, '_request_actor_emp_code', lambda: '9001')
    conn = FakeConnection()

    db_connection._stamp_audit_actor(conn)

    assert conn.executed == [("SELECT set_config(%s, %s, false)", ('app.current_emp_code', '9001'))]
    assert getattr(conn, db_connection._AUDIT_ACTOR_FLAG) == '9001'


def test_actor_is_cleared_before_the_connection_is_reused(monkeypatch):
    monkeypatch.setattr(db_connection, '_request_actor_emp_code', lambda: '9001')
    conn = FakeConnection()
    db_connection._stamp_audit_actor(conn)
    conn.executed.clear()

    db_connection._clear_audit_actor(conn)

    assert conn.executed == [("SELECT set_config(%s, '', false)", ('app.current_emp_code',))]
    assert conn.rollbacks == 1
    assert conn.commits == 1
    assert getattr(conn, db_connection._AUDIT_ACTOR_FLAG) is None


def test_unstamped_connections_are_returned_untouched():
    conn = FakeConnection()

    db_connection._clear_audit_actor(conn)

    assert conn.executed == []
    assert conn.rollbacks == 0


def test_stamping_failures_never_break_the_request(monkeypatch):
    monkeypatch.setattr(db_connection, '_request_actor_emp_code', lambda: '9001')

    class BrokenConnection(FakeConnection):
        def cursor(self):
            raise RuntimeError('connection lost')

    conn = BrokenConnection()
    db_connection._stamp_audit_actor(conn)

    assert getattr(conn, db_connection._AUDIT_ACTOR_FLAG, None) is None
