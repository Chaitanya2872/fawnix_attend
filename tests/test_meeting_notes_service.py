from io import BytesIO

from werkzeug.datastructures import FileStorage

import services.meeting_notes_service as meeting_notes_service


class FakeResponse:
    def __init__(self, payload, status_code=200, text=""):
        self._payload = payload
        self.status_code = status_code
        self.text = text
        self.ok = status_code < 400

    def json(self):
        return self._payload


def test_generate_meeting_notes_success(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "FEATURE_MEETING_NOTES", True)
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setattr(meeting_notes_service.Config, "OPENAI_API_KEY", "")
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_ALLOWED_EXTENSIONS", ["mp3"])
    monkeypatch.setattr(meeting_notes_service, "is_minio_configured", lambda: True)

    calls = []
    uploads = []

    def fake_post(url, headers=None, data=None, files=None, json=None, timeout=None):
        calls.append(
            {
                "url": url,
                "headers": headers,
                "data": data,
                "files": files,
                "json": json,
                "timeout": timeout,
            }
        )
        if ":generateContent?key=gemini-test-key" in url:
            return FakeResponse(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": (
                                            '{"transcript":"Alice reviewed the roadmap and assigned follow-ups.",'
                                            '"summary":"Roadmap review completed.",'
                                            '"minutes_of_meeting":"Agenda: roadmap\\nDecision: proceed\\nAction items: Alice to share notes.",'
                                            '"important_points":["Roadmap reviewed","Action item assigned"]}'
                                        )
                                    }
                                ]
                            }
                        }
                    ]
                }
            )
        raise AssertionError(f"Unexpected URL: {url}")

    monkeypatch.setattr(meeting_notes_service.requests, "post", fake_post)
    monkeypatch.setattr(
        meeting_notes_service,
        "upload_meeting_audio",
        lambda audio_bytes, filename, content_type=None, emp_code=None, meeting_title=None: uploads.append(
            {
                "audio_bytes": audio_bytes,
                "filename": filename,
                "content_type": content_type,
                "emp_code": emp_code,
                "meeting_title": meeting_title,
            }
        ) or {
            "bucket": "test-bucket",
            "object_name": "meeting-audio/test.mp3",
            "file_name": filename,
            "content_type": content_type,
            "size_bytes": len(audio_bytes),
            "url": "http://minio/test-bucket/meeting-audio/test.mp3",
        },
    )

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    response, status_code = meeting_notes_service.generate_meeting_notes(
        audio_file,
        meeting_title="Weekly Sync",
        language="en",
        emp_code="EMP001",
    )

    assert status_code == 200
    assert response["success"] is True
    assert response["data"]["provider"] == "gemini"
    assert response["data"]["summary"] == "Roadmap review completed."
    assert "Agenda: roadmap" in response["data"]["minutes_of_meeting"]
    assert response["data"]["important_points"] == ["Roadmap reviewed", "Action item assigned"]
    assert response["data"]["transcript"] == "Alice reviewed the roadmap and assigned follow-ups."
    assert response["data"]["audio_storage"]["bucket"] == "test-bucket"
    assert ":generateContent?key=gemini-test-key" in calls[0]["url"]
    assert calls[0]["json"]["contents"][0]["parts"][1]["inline_data"]["mime_type"] == "audio/mpeg"
    assert uploads[0]["filename"] == "meeting.mp3"
    assert uploads[0]["emp_code"] == "EMP001"


def test_generate_meeting_notes_requires_configuration(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "FEATURE_MEETING_NOTES", True)
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_API_KEY", "")
    monkeypatch.setattr(meeting_notes_service.Config, "OPENAI_API_KEY", "")

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    response, status_code = meeting_notes_service.generate_meeting_notes(audio_file)

    assert status_code == 503
    assert response["success"] is False
    assert "GEMINI_API_KEY" in response["message"]
