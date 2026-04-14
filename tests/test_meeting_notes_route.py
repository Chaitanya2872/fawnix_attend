from io import BytesIO

from flask import Flask

import middleware.auth_middleware as auth_middleware
import routes.meeting_notes as meeting_notes_routes
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
