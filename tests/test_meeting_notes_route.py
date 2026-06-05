from io import BytesIO

from flask import Flask

import middleware.auth_middleware as auth_middleware
import routes.meeting_notes as meeting_notes_routes
from middleware.error_handler import register_error_handlers
from routes.meeting_notes import meeting_notes_bp


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


def create_test_app():
    app = Flask(__name__)
    register_error_handlers(app)
    app.register_blueprint(meeting_notes_bp, url_prefix="/api/meeting-notes")
    return app


def authenticate_request(monkeypatch, user_row):
    monkeypatch.setattr(
        auth_middleware,
        "decode_jwt_token",
        lambda token: {"sub": user_row.get("emp_code", "E001")},
    )
    monkeypatch.setattr(
        auth_middleware,
        "get_db_connection",
        lambda: AuthConnection(user_row),
    )


def test_generate_meeting_notes_route_accepts_audio_upload(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
            "emp_full_name": "Employee One",
            "emp_email": "e001@example.com",
            "emp_designation": "Engineer",
            "emp_department": "Sales",
            "emp_manager": "M001",
        },
    )

    captured = {}

    def fake_generate_meeting_notes(audio_file, meeting_title=None, language=None, emp_code=None):
        captured["filename"] = audio_file.filename if audio_file else None
        captured["meeting_title"] = meeting_title
        captured["language"] = language
        captured["emp_code"] = emp_code
        return (
            {
                "success": True,
                "message": "Meeting notes generated successfully",
                "data": {
                    "summary": "Summary text",
                    "minutes_of_meeting": "Minutes text",
                    "important_points": ["Point 1", "Point 2"],
                    "transcript": "Transcript text",
                },
            },
            200,
        )

    monkeypatch.setattr(meeting_notes_routes, "generate_meeting_notes", fake_generate_meeting_notes)

    response = client.post(
        "/api/meeting-notes/generate",
        headers={"Authorization": "Bearer test-token"},
        data={
            "meeting_title": "Weekly Review",
            "language": "en",
            "audio": (BytesIO(b"audio-bytes"), "meeting.mp3"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert captured["filename"] == "meeting.mp3"
    assert captured["meeting_title"] == "Weekly Review"
    assert captured["language"] == "en"
    assert captured["emp_code"] == "E001"


def test_upload_meeting_note_audio_route(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
        },
    )

    captured = {}

    def fake_upload_meeting_note_audio(audio_file, meeting_title=None, language=None, emp_code=None):
        captured["filename"] = audio_file.filename if audio_file else None
        captured["meeting_title"] = meeting_title
        captured["language"] = language
        captured["emp_code"] = emp_code
        return (
            {
                "success": True,
                "message": "Audio uploaded successfully",
                "data": {
                    "meeting_note_id": "mn_test_001",
                    "status": "uploaded",
                },
            },
            201,
        )

    monkeypatch.setattr(meeting_notes_routes, "upload_meeting_note_audio", fake_upload_meeting_note_audio)

    response = client.post(
        "/api/meeting-notes/upload",
        headers={"Authorization": "Bearer test-token"},
        data={
            "meeting_title": "Board Review",
            "language": "en",
            "audio": (BytesIO(b"audio-bytes"), "board.mp3"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    assert response.get_json()["success"] is True
    assert response.get_json()["data"]["meeting_note_id"] == "mn_test_001"
    assert captured["filename"] == "board.mp3"
    assert captured["meeting_title"] == "Board Review"
    assert captured["language"] == "en"
    assert captured["emp_code"] == "E001"


def test_generate_meeting_notes_route_from_saved_record(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
        },
    )

    captured = {}

    def fake_generate_from_saved(meeting_note_id, emp_code=None):
        captured["meeting_note_id"] = meeting_note_id
        captured["emp_code"] = emp_code
        return (
            {
                "success": True,
                "message": "Meeting notes generated successfully",
                "data": {
                    "meeting_note_id": meeting_note_id,
                    "status": "generated",
                },
            },
            200,
        )

    monkeypatch.setattr(meeting_notes_routes, "generate_meeting_notes_from_saved", fake_generate_from_saved)

    response = client.post(
        "/api/meeting-notes/generate",
        headers={"Authorization": "Bearer test-token"},
        json={"meeting_note_id": "mn_saved_001"},
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert captured["meeting_note_id"] == "mn_saved_001"
    assert captured["emp_code"] == "E001"


def test_list_meeting_notes_route(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
        },
    )

    captured = {}

    def fake_list_meeting_note_records(*, emp_code, status=None, limit=50):
        captured["emp_code"] = emp_code
        captured["status"] = status
        captured["limit"] = limit
        return (
            {
                "success": True,
                "data": {
                    "items": [{"meeting_note_id": "mn_list_001"}],
                    "count": 1,
                    "total_count": 1,
                    "limit": limit,
                    "status_filter": status,
                },
            },
            200,
        )

    monkeypatch.setattr(meeting_notes_routes, "list_meeting_note_records", fake_list_meeting_note_records)

    response = client.get(
        "/api/meeting-notes?status=generated&limit=25",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert response.get_json()["data"]["items"][0]["meeting_note_id"] == "mn_list_001"
    assert captured["emp_code"] == "E001"
    assert captured["status"] == "generated"
    assert captured["limit"] == 25


def test_get_meeting_note_route(monkeypatch):
    app = create_test_app()
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
        },
    )

    captured = {}

    def fake_get_meeting_note_record(meeting_note_id, *, emp_code):
        captured["meeting_note_id"] = meeting_note_id
        captured["emp_code"] = emp_code
        return (
            {
                "success": True,
                "data": {
                    "meeting_note_id": meeting_note_id,
                    "status": "generated",
                },
            },
            200,
        )

    monkeypatch.setattr(meeting_notes_routes, "get_meeting_note_record", fake_get_meeting_note_record)

    response = client.get(
        "/api/meeting-notes/mn_detail_001",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert response.get_json()["data"]["meeting_note_id"] == "mn_detail_001"
    assert captured["meeting_note_id"] == "mn_detail_001"
    assert captured["emp_code"] == "E001"


def test_generate_meeting_notes_route_returns_json_for_oversized_upload(monkeypatch):
    app = create_test_app()
    app.config["MAX_CONTENT_LENGTH"] = 4
    client = app.test_client()

    authenticate_request(
        monkeypatch,
        {
            "id": 7,
            "emp_code": "E001",
            "role": "employee",
            "is_active": True,
        },
    )

    response = client.post(
        "/api/meeting-notes/generate",
        headers={"Authorization": "Bearer test-token"},
        data={
            "audio": (BytesIO(b"audio-bytes"), "meeting.mp3"),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 413
    assert response.is_json is True
    assert response.get_json() == {
        "success": False,
        "error": "Request Entity Too Large",
        "message": "Uploaded file is too large. Maximum request size is 4 bytes.",
    }
