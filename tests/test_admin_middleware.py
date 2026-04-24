from flask import Flask, jsonify

from middleware.admin_middleware import hr_or_devtester_required


def _make_app(current_user):
    app = Flask(__name__)

    @app.get("/read")
    @hr_or_devtester_required
    def read_route(*args, **kwargs):
        return jsonify({"success": True}), 200

    @app.post("/write")
    @hr_or_devtester_required
    def write_route(*args, **kwargs):
        return jsonify({"success": True}), 200

    app.current_user = current_user
    return app


def _invoke_with_user(app, method, path):
    @app.before_request
    def inject_user():
        return None

    endpoint = app.view_functions[path.strip("/").replace("-", "_") if path != "/" else "index"]
    return endpoint(app.current_user)


def test_hr_cannot_access_admin_read_route():
    app = Flask(__name__)

    @app.get("/read")
    @hr_or_devtester_required
    def read(current_user):
        return jsonify({"success": True}), 200

    with app.test_request_context("/read", method="GET"):
        response, status_code = read({
            "emp_designation": "HR",
            "role": "hr",
            "can_read": False,
            "can_write": False,
        })

    assert status_code == 403
    assert response.get_json()["message"] == "Admin read access denied"


def test_admin_with_read_permission_can_access_admin_read_route():
    app = Flask(__name__)

    @app.get("/read")
    @hr_or_devtester_required
    def read(current_user):
        return jsonify({"success": True}), 200

    with app.test_request_context("/read", method="GET"):
        response, status_code = read({
            "emp_designation": "Manager",
            "role": "admin",
            "can_read": True,
            "can_write": False,
        })

    assert status_code == 200
    assert response.get_json()["success"] is True


def test_admin_without_write_permission_cannot_access_admin_write_route():
    app = Flask(__name__)

    @app.post("/write")
    @hr_or_devtester_required
    def write(current_user):
        return jsonify({"success": True}), 200

    with app.test_request_context("/write", method="POST"):
        response, status_code = write({
            "emp_designation": "Manager",
            "role": "admin",
            "can_read": True,
            "can_write": False,
        })

    assert status_code == 403
    assert response.get_json()["message"] == "Admin write access denied"


def test_devtester_can_access_admin_write_route_without_db_permissions():
    app = Flask(__name__)

    @app.post("/write")
    @hr_or_devtester_required
    def write(current_user):
        return jsonify({"success": True}), 200

    with app.test_request_context("/write", method="POST"):
        response, status_code = write({
            "emp_designation": "DevTester",
            "role": "employee",
            "can_read": False,
            "can_write": False,
        })

    assert status_code == 200
    assert response.get_json()["success"] is True
