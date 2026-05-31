from pathlib import Path

import database.connection as db_connection


class FakeCursor:
    def __init__(self, executed_rows=None):
        self.executed_rows = executed_rows or []
        self.fetch_results = []
        self.executed_sql = []

    def execute(self, sql, params=None):
        normalized = " ".join(str(sql).split())
        self.executed_sql.append((normalized, params))
        if normalized.startswith("SELECT filename FROM schema_migrations"):
            self.fetch_results = [{"filename": name} for name in self.executed_rows]

    def fetchall(self):
        return list(self.fetch_results)

    def close(self):
        pass


class FakeConnection:
    def __init__(self, executed_rows=None):
        self.cursor_obj = FakeCursor(executed_rows=executed_rows)
        self.commits = 0
        self.rollbacks = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass


def test_normalize_migration_sql_removes_transaction_wrappers():
    sql_text = "BEGIN;\nCREATE TABLE demo(id INT);\nCOMMIT;\n"
    normalized = db_connection._normalize_migration_sql(sql_text)
    assert normalized == "CREATE TABLE demo(id INT);"


def test_run_migrations_skips_already_applied_files(tmp_path, monkeypatch):
    migrations_dir = tmp_path / "migrations"
    migrations_dir.mkdir()
    (migrations_dir / "001_first.sql").write_text("BEGIN;\nSELECT 1;\nCOMMIT;\n", encoding="utf-8")
    (migrations_dir / "002_second.sql").write_text("SELECT 2;\n", encoding="utf-8")

    listing_conn = FakeConnection(executed_rows=["001_first.sql"])
    pending_conn = FakeConnection()
    connections = [listing_conn, pending_conn]

    monkeypatch.setattr(db_connection, "MIGRATIONS_DIR", migrations_dir)
    monkeypatch.setattr(db_connection, "get_db_connection", lambda: connections.pop(0))
    monkeypatch.setattr(db_connection, "return_connection", lambda conn: None)

    db_connection.run_migrations()

    executed_sql = [sql for sql, _ in pending_conn.cursor_obj.executed_sql]
    assert any("SELECT 2;" in sql for sql in executed_sql)
    assert all("SELECT 1;" not in sql for sql in executed_sql)
    assert pending_conn.commits == 1
