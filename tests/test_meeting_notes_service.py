from io import BytesIO

from werkzeug.datastructures import FileStorage

import services.s3_storage_service as s3_storage_service
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
    monkeypatch.setattr(meeting_notes_service, "is_s3_configured", lambda: True)

    calls = []
    uploads = []
    report_uploads = []

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
            "object_name": "meeting-notes/audio/test.mp3",
            "file_name": filename,
            "content_type": content_type,
            "size_bytes": len(audio_bytes),
            "url": "https://test-bucket.s3.ap-south-1.amazonaws.com/meeting-notes/audio/test.mp3",
        },
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "upload_meeting_report",
        lambda report_payload, emp_code=None, meeting_title=None: report_uploads.append(
            {
                "report_payload": report_payload,
                "emp_code": emp_code,
                "meeting_title": meeting_title,
            }
        ) or {
            "bucket": "test-bucket",
            "object_name": "meeting-notes/generated-reports/test.pdf",
            "file_name": "weekly-sync.pdf",
            "content_type": "application/pdf",
            "size_bytes": 512,
            "url": "https://test-bucket.s3.ap-south-1.amazonaws.com/meeting-notes/generated-reports/test.pdf",
            "download_url": "https://test-bucket.s3.ap-south-1.amazonaws.com/meeting-notes/generated-reports/test.pdf",
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
    assert response["data"]["report_storage"]["bucket"] == "test-bucket"
    assert response["data"]["report_storage"]["content_type"] == "application/pdf"
    assert ":generateContent?key=gemini-test-key" in calls[0]["url"]
    assert calls[0]["json"]["contents"][0]["parts"][1]["inline_data"]["mime_type"] == "audio/mpeg"
    assert uploads[0]["filename"] == "meeting.mp3"
    assert uploads[0]["emp_code"] == "EMP001"
    assert report_uploads[0]["emp_code"] == "EMP001"


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


def test_generate_notes_with_gemini_retries_temporary_unavailable(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_MEETING_NOTES_MAX_RETRIES", 3)
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_MEETING_NOTES_RETRY_DELAY_SECONDS", 0)

    responses = [
        FakeResponse(
            {
                "error": {
                    "code": 503,
                    "message": "high demand",
                    "status": "UNAVAILABLE",
                }
            },
            status_code=503,
            text='{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}',
        ),
        FakeResponse(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        '{"transcript":"Transcript",'
                                        '"summary":"Summary",'
                                        '"minutes_of_meeting":"Minutes",'
                                        '"important_points":["Point 1"]}'
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        ),
    ]
    call_count = {"count": 0}

    def fake_post(url, headers=None, json=None, timeout=None):
        call_count["count"] += 1
        return responses.pop(0)

    monkeypatch.setattr(meeting_notes_service.requests, "post", fake_post)
    monkeypatch.setattr(meeting_notes_service.time, "sleep", lambda seconds: None)

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    structured = meeting_notes_service._generate_notes_with_gemini(audio_file, meeting_title="Retry Test")

    assert call_count["count"] == 2
    assert structured["summary"] == "Summary"


def test_upload_meeting_report_returns_public_url_when_enabled(monkeypatch):
    monkeypatch.setattr(s3_storage_service.Config, "MEETING_NOTES_S3_BUCKET", "test-bucket")
    monkeypatch.setattr(s3_storage_service.Config, "MEETING_NOTES_S3_REGION", "ap-south-1")
    monkeypatch.setattr(s3_storage_service.Config, "MEETING_NOTES_S3_REPORT_PREFIX", "meeting-notes/generated-reports")
    monkeypatch.setattr(s3_storage_service.Config, "MEETING_NOTES_S3_PUBLIC_READ", True)
    monkeypatch.setattr(s3_storage_service, "_build_meeting_report_pdf", lambda report_payload, generated_at=None: b"pdf-bytes")

    captured = {}

    class FakeClient:
        def upload_fileobj(self, Fileobj=None, Bucket=None, Key=None, ExtraArgs=None):
            captured["bucket"] = Bucket
            captured["key"] = Key
            captured["extra_args"] = ExtraArgs

    monkeypatch.setattr(s3_storage_service, "_build_s3_client", lambda: FakeClient())

    result = s3_storage_service.upload_meeting_report(
        {"meeting_title": "Weekly Sync"},
        emp_code="EMP001",
        meeting_title="Weekly Sync",
    )

    assert captured["extra_args"]["ACL"] == "public-read"
    assert result["url"] == result["object_url"]
    assert result["download_url"] == result["object_url"]
