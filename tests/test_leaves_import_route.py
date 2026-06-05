from datetime import date
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch

from flask import Flask

import middleware.auth_middleware as auth_middleware
import routes.admin as admin_routes
import services.admin_service as admin_service
import services.leaves_import_service as leaves_import_service
from routes.admin import admin_bp
from services.leaves_import_service import import_leave_rows, parse_leave_csv_rows


class AuthCursor:
    def __init__(self, user_row):
        self.user_row = user_row

    def execute(self, sql, params=None):
        self.sql = sql
        self.params = params

    def fetchone(self):
        return self.user_row

    def close(self):
        pass


class AuthConnection:
    def __init__(self, user_row):
        self.cursor_obj = AuthCursor(user_row)

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


class ImportCursor:
    def __init__(self):
        self.current_result = None
        self.insert_params = None

    def execute(self, sql, params=None):
        normalized_sql = " ".join(sql.split())
        if "FROM employees e" in normalized_sql:
            self.current_result = {
                "emp_code": "E001",
                "emp_full_name": "Employee One",
                "emp_email": "e001@example.com",
                "emp_manager": "M001",
                "manager_email": "manager@example.com",
            }
        elif "SELECT id FROM leaves" in normalized_sql:
            self.current_result = None
        elif "INSERT INTO leaves" in normalized_sql:
            self.insert_params = params
            self.current_result = {"id": 101}
        else:
            self.current_result = None

    def fetchone(self):
        return self.current_result

    def close(self):
        pass


class ImportConnection:
    def __init__(self):
        self.cursor_obj = ImportCursor()
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class LeaveFilterCursor:
    def __init__(self):
        self.query = ""
        self.params = []

    def execute(self, query, params=None):
        self.query = " ".join(query.split())
        self.params = list(params or [])

    def fetchall(self):
        return []

    def close(self):
        pass


class LeaveFilterConnection:
    def __init__(self):
        self.cursor_obj = LeaveFilterCursor()

    def cursor(self):
        return self.cursor_obj

    def close(self):
        pass


def create_test_app():
    app = Flask(__name__)
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    return app


class LeavesImportRouteTests(TestCase):
    def setUp(self):
        self.app = create_test_app()
        self.client = self.app.test_client()
        self.user_row = {
            "id": 7,
            "emp_code": "ADMIN001",
            "role": "admin",
            "is_active": True,
            "can_read": True,
            "can_write": True,
            "emp_designation": "HR Manager",
        }

    def auth_patches(self):
        return (
            patch.object(
                auth_middleware,
                "decode_jwt_token",
                lambda token: {"sub": self.user_row["emp_code"]},
            ),
            patch.object(
                auth_middleware,
                "get_db_connection",
                lambda: AuthConnection(self.user_row),
            ),
        )

    @staticmethod
    def success_response():
        return {
            "success": True,
            "message": "Leave records imported successfully",
            "data": {
                "total_rows": 1,
                "inserted_count": 1,
                "skipped_count": 0,
                "failed_count": 0,
            },
        }, 201

    def test_import_leaves_route_accepts_csv_json(self):
        captured = {}

        def fake_import(csv_content, default_status, strict, skip_duplicates):
            captured.update({
                "csv_content": csv_content,
                "default_status": default_status,
                "strict": strict,
                "skip_duplicates": skip_duplicates,
            })
            return self.success_response()

        auth_decode_patch, auth_db_patch = self.auth_patches()
        with auth_decode_patch, auth_db_patch, patch.object(
            admin_routes,
            "import_leaves_from_csv",
            fake_import,
        ):
            response = self.client.post(
                "/api/admin/leaves/import",
                headers={"Authorization": "Bearer test-token"},
                json={
                    "csv_content": "emp_code,from_date,to_date,leave_type\nE001,2026-06-01,2026-06-01,casual",
                    "default_status": "pending",
                    "strict": False,
                    "skip_duplicates": True,
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["data"]["inserted_count"], 1)
        self.assertEqual(captured["default_status"], "pending")
        self.assertIs(captured["strict"], False)
        self.assertIs(captured["skip_duplicates"], True)
        self.assertTrue(captured["csv_content"].startswith("emp_code,from_date"))

    def test_import_leaves_route_accepts_csv_upload(self):
        captured = {}

        def fake_import(csv_content, default_status, strict, skip_duplicates):
            captured["csv_content"] = csv_content
            return self.success_response()

        auth_decode_patch, auth_db_patch = self.auth_patches()
        with auth_decode_patch, auth_db_patch, patch.object(
            admin_routes,
            "import_leaves_from_csv",
            fake_import,
        ):
            response = self.client.post(
                "/api/admin/leaves/import",
                headers={"Authorization": "Bearer test-token"},
                data={
                    "file": (
                        BytesIO(b"emp_code,from_date,to_date,leave_type\nE001,2026-06-01,2026-06-01,casual"),
                        "leaves.csv",
                    ),
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(captured["csv_content"].startswith("emp_code,from_date"))

    def test_import_leaves_route_requires_import_data(self):
        auth_decode_patch, auth_db_patch = self.auth_patches()
        with auth_decode_patch, auth_db_patch:
            response = self.client.post(
                "/api/admin/leaves/import",
                headers={"Authorization": "Bearer test-token"},
                json={},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json()["message"],
            "Provide a CSV file, csv_content, or a rows array",
        )

    def test_csv_parser_accepts_utf8_bom(self):
        rows = parse_leave_csv_rows(
            "\ufeffemp_code,from_date,to_date,leave_type\nE001,2026-06-01,2026-06-01,casual"
        )

        self.assertEqual(rows[0]["emp_code"], "E001")

    def test_invalid_default_status_does_not_open_database_connection(self):
        response, status_code = import_leave_rows(
            rows=[{
                "emp_code": "E001",
                "from_date": "2026-06-01",
                "to_date": "2026-06-01",
                "leave_type": "casual",
            }],
            default_status="unknown",
        )

        self.assertEqual(status_code, 400)
        self.assertIn("Invalid status", response["message"])

    def test_import_leave_rows_inserts_valid_record(self):
        connection = ImportConnection()
        with patch.object(
            leaves_import_service,
            "get_db_connection",
            return_value=connection,
        ), patch.object(
            leaves_import_service,
            "return_connection",
        ):
            response, status_code = import_leave_rows(
                rows=[{
                    "emp_code": "E001",
                    "from_date": "2026-06-01",
                    "to_date": "2026-06-01",
                    "leave_type": "casual",
                    "duration": "full_day",
                    "leave_count": "1",
                    "notes": "Personal leave",
                }],
                default_status="approved",
            )

        self.assertEqual(status_code, 201)
        self.assertTrue(response["success"])
        self.assertEqual(response["data"]["inserted_count"], 1)
        self.assertEqual(response["data"]["inserted"][0]["leave_id"], 101)
        self.assertTrue(connection.committed)
        self.assertIsNotNone(connection.cursor_obj.insert_params)

    def test_leave_filters_are_forwarded_by_admin_route(self):
        captured = {}

        def fake_get_all_leaves(**kwargs):
            captured.update(kwargs)
            return {"success": True, "data": {"leaves": [], "count": 0}}, 200

        auth_decode_patch, auth_db_patch = self.auth_patches()
        with auth_decode_patch, auth_db_patch, patch.object(
            admin_routes.admin_service,
            "get_all_leaves",
            fake_get_all_leaves,
        ):
            response = self.client.get(
                "/api/admin/leaves"
                "?employee_name=Alice"
                "&employee_id=EMP1"
                "&leave_type=casual"
                "&status=approved"
                "&from_date=2026-06-01"
                "&to_date=2026-06-30"
                "&limit=500",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured["employee_name"], "Alice")
        self.assertEqual(captured["employee_id"], "EMP1")
        self.assertEqual(captured["leave_type"], "casual")
        self.assertEqual(captured["status"], "approved")
        self.assertEqual(captured["from_date"], date(2026, 6, 1))
        self.assertEqual(captured["to_date"], date(2026, 6, 30))
        self.assertTrue(captured["overlap_dates"])

    def test_leave_filter_service_uses_partial_search_and_date_overlap(self):
        connection = LeaveFilterConnection()
        with patch.object(admin_service, "get_db_connection", return_value=connection):
            response, status_code = admin_service.get_all_leaves(
                limit=500,
                status="approved",
                employee_name="Alice",
                employee_id="EMP1",
                leave_type="casual",
                from_date=date(2026, 6, 1),
                to_date=date(2026, 6, 30),
                overlap_dates=True,
            )

        self.assertEqual(status_code, 200)
        self.assertTrue(response["success"])
        self.assertIn("e.emp_full_name ILIKE %s", connection.cursor_obj.query)
        self.assertIn("l.emp_code ILIKE %s", connection.cursor_obj.query)
        self.assertIn("LOWER(l.leave_type) = LOWER(%s)", connection.cursor_obj.query)
        self.assertIn("l.to_date >= %s", connection.cursor_obj.query)
        self.assertIn("l.from_date <= %s", connection.cursor_obj.query)
        self.assertEqual(
            connection.cursor_obj.params,
            [
                "approved",
                "%Alice%",
                "%EMP1%",
                "casual",
                date(2026, 6, 1),
                date(2026, 6, 30),
                500,
            ],
        )

    def test_leave_filter_route_rejects_reversed_date_range(self):
        auth_decode_patch, auth_db_patch = self.auth_patches()
        with auth_decode_patch, auth_db_patch:
            response = self.client.get(
                "/api/admin/leaves?from_date=2026-06-30&to_date=2026-06-01",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["message"], "from_date must be on or before to_date")
