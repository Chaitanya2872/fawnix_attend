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
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", False)
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
            parts = json["contents"][0]["parts"]
            if len(parts) == 2:
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
    assert "Listen to the uploaded meeting audio" in calls[0]["json"]["contents"][0]["parts"][0]["text"]
    assert calls[0]["json"]["contents"][0]["parts"][1]["inline_data"]["mime_type"] == "audio/mp3"
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
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", False)

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


def test_generate_transcript_uses_local_pipeline_when_enabled(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", True)
    monkeypatch.setattr(
        meeting_notes_service,
        "_transcribe_audio_locally",
        lambda audio_file, language=None: "[Speaker 1]: Local transcript",
    )

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    transcript = meeting_notes_service._generate_transcript(audio_file, language="en")

    assert transcript == "[Speaker 1]: Local transcript"


def test_generate_transcript_falls_back_to_openai_when_local_disabled(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", False)
    monkeypatch.setattr(
        meeting_notes_service,
        "_generate_transcript_with_openai",
        lambda audio_file, language=None: "Remote transcript",
    )

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    transcript = meeting_notes_service._generate_transcript(audio_file, language="en")

    assert transcript == "Remote transcript"


def test_generate_transcript_falls_back_to_openai_when_local_pipeline_fails(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", True)
    monkeypatch.setattr(meeting_notes_service.Config, "OPENAI_API_KEY", "openai-test-key")
    monkeypatch.setattr(
        meeting_notes_service,
        "_transcribe_audio_locally",
        lambda audio_file, language=None: (_ for _ in ()).throw(RuntimeError("local pipeline failed")),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_generate_transcript_with_openai",
        lambda audio_file, language=None: "Fallback transcript",
    )

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    transcript = meeting_notes_service._generate_transcript(audio_file, language="en")

    assert transcript == "Fallback transcript"


def test_generate_notes_with_gemini_falls_back_to_direct_audio_when_local_transcript_fails(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", True)
    monkeypatch.setattr(
        meeting_notes_service,
        "_generate_local_transcript",
        lambda audio_file, language=None: (_ for _ in ()).throw(RuntimeError("transcript failed")),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_generate_notes_with_gemini_from_audio",
        lambda audio_file, meeting_title=None, language=None: {
            "transcript": "Fallback transcript",
            "summary": "Fallback summary",
            "minutes_of_meeting": "Fallback minutes",
            "important_points": ["Fallback point"],
        },
    )

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    structured = meeting_notes_service._generate_notes_with_gemini(audio_file, meeting_title="Retry Test")

    assert structured["summary"] == "Fallback summary"


def test_generate_notes_with_gemini_uses_local_transcript_when_enabled(monkeypatch):
    monkeypatch.setattr(meeting_notes_service.Config, "GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setattr(meeting_notes_service.Config, "MEETING_NOTES_USE_LOCAL_TRANSCRIPTION", True)
    monkeypatch.setattr(
        meeting_notes_service,
        "_generate_local_transcript",
        lambda audio_file, language=None: "[Speaker 1]: Transcript",
    )

    calls = []

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append({"url": url, "json": json})
        return FakeResponse(
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
        )

    monkeypatch.setattr(meeting_notes_service.requests, "post", fake_post)

    audio_file = FileStorage(
        stream=BytesIO(b"fake-audio"),
        filename="meeting.mp3",
        content_type="audio/mpeg",
    )

    structured = meeting_notes_service._generate_notes_with_gemini(audio_file, meeting_title="Retry Test")

    assert structured["summary"] == "Summary"
    assert "Transcript:\n[Speaker 1]: Transcript" in calls[0]["json"]["contents"][0]["parts"][0]["text"]


def test_parse_structured_notes_extracts_json_from_fenced_output():
    content = """```json
Here is the structured result:
{"transcript":"Transcript","summary":"Summary","minutes_of_meeting":"Minutes","important_points":["Point 1"]}
```"""

    structured = meeting_notes_service._parse_structured_notes(content)

    assert structured["transcript"] == "Transcript"
    assert structured["summary"] == "Summary"
    assert structured["minutes_of_meeting"] == "Minutes"
    assert structured["important_points"] == ["Point 1"]


def test_parse_structured_notes_repairs_trailing_comma_json():
    content = """
    {
      "transcript": "Transcript",
      "summary": "Summary",
      "minutes_of_meeting": "Minutes",
      "important_points": ["Point 1",],
    }
    """

    structured = meeting_notes_service._parse_structured_notes(content)

    assert structured["transcript"] == "Transcript"
    assert structured["summary"] == "Summary"
    assert structured["minutes_of_meeting"] == "Minutes"
    assert structured["important_points"] == ["Point 1"]


def test_parse_structured_notes_falls_back_to_markdown_payload():
    content = """# Minutes of Meeting
## Meeting Summary
- Roadmap reviewed
- Action items assigned

## Action Items
| Action Item | Owner | Due Date | Priority |
| --- | --- | --- | --- |
| Share notes | Alice | Not Specified | Medium |
"""

    structured = meeting_notes_service._parse_structured_notes(content)

    assert structured["transcript"] == ""
    assert "Roadmap reviewed" in structured["summary"]
    assert structured["minutes_of_meeting"] == content
    assert structured["important_points"] == ["Roadmap reviewed", "Action items assigned"]


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


def test_queue_meeting_notes_generation_from_saved_returns_existing_active_job(monkeypatch):
    monkeypatch.setattr(
        meeting_notes_service,
        "_validate_saved_meeting_note_generation",
        lambda meeting_note_id, emp_code=None: (
            "gemini",
            {
                "meeting_note_id": meeting_note_id,
                "status": "queued",
            },
            None,
        ),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_fetch_active_meeting_note_job",
        lambda meeting_note_id: {"job_id": "mnj_active_001", "status": "processing"},
    )

    response, status_code = meeting_notes_service.queue_meeting_notes_generation_from_saved(
        "mn_active_001",
        emp_code="EMP001",
    )

    assert status_code == 202
    assert response["message"] == "Meeting notes generation is already queued"
    assert response["data"]["job_id"] == "mnj_active_001"
    assert response["data"]["job_status"] == "processing"


def test_queue_meeting_notes_generation_from_saved_creates_queue_job(monkeypatch):
    queued_record = {
        "meeting_note_id": "mn_queue_001",
        "status": "uploaded",
        "provider": "gemini",
    }
    monkeypatch.setattr(
        meeting_notes_service,
        "_validate_saved_meeting_note_generation",
        lambda meeting_note_id, emp_code=None: ("gemini", queued_record, None),
    )
    monkeypatch.setattr(meeting_notes_service, "_fetch_active_meeting_note_job", lambda meeting_note_id: None)

    calls = {"queued": 0, "created": 0, "fetched": 0}

    monkeypatch.setattr(
        meeting_notes_service,
        "_mark_meeting_note_queued",
        lambda meeting_note_id: calls.__setitem__("queued", calls["queued"] + 1),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_create_meeting_note_job",
        lambda meeting_note_id, emp_code=None, provider=None: calls.__setitem__("created", calls["created"] + 1) or {
            "job_id": "mnj_queue_001",
            "status": "queued",
        },
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_fetch_meeting_note_record",
        lambda meeting_note_id, emp_code=None: calls.__setitem__("fetched", calls["fetched"] + 1) or queued_record,
    )

    response, status_code = meeting_notes_service.queue_meeting_notes_generation_from_saved(
        "mn_queue_001",
        emp_code="EMP001",
    )

    assert status_code == 202
    assert response["message"] == "Meeting notes generation queued"
    assert response["data"]["job_id"] == "mnj_queue_001"
    assert response["data"]["job_status"] == "queued"
    assert calls == {"queued": 1, "created": 1, "fetched": 1}


def test_queue_meeting_notes_generation_from_saved_force_requeues_active_job(monkeypatch):
    active_record = {
        "meeting_note_id": "mn_force_001",
        "status": "queued",
        "provider": "gemini",
    }
    monkeypatch.setattr(
        meeting_notes_service,
        "_validate_saved_meeting_note_generation",
        lambda meeting_note_id, emp_code=None: ("gemini", active_record, None),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_fetch_active_meeting_note_job",
        lambda meeting_note_id: {"job_id": "mnj_old_001", "status": "queued"},
    )

    calls = {"failed_old": 0, "queued": 0, "created": 0}

    monkeypatch.setattr(
        meeting_notes_service,
        "_update_meeting_note_job_status",
        lambda job_id, status=None, last_error=None, retry_delay_seconds=None: calls.__setitem__("failed_old", calls["failed_old"] + 1),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_mark_meeting_note_queued",
        lambda meeting_note_id: calls.__setitem__("queued", calls["queued"] + 1),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_create_meeting_note_job",
        lambda meeting_note_id, emp_code=None, provider=None: calls.__setitem__("created", calls["created"] + 1) or {
            "job_id": "mnj_new_001",
            "status": "queued",
        },
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_fetch_meeting_note_record",
        lambda meeting_note_id, emp_code=None: active_record,
    )

    response, status_code = meeting_notes_service.queue_meeting_notes_generation_from_saved(
        "mn_force_001",
        emp_code="EMP001",
        force=True,
    )

    assert status_code == 202
    assert response["message"] == "Meeting notes generation re-queued"
    assert response["data"]["job_id"] == "mnj_new_001"
    assert calls == {"failed_old": 1, "queued": 1, "created": 1}


def test_queue_meeting_notes_generation_from_saved_force_rejects_fresh_processing_job(monkeypatch):
    active_record = {
        "meeting_note_id": "mn_force_busy_001",
        "status": "processing",
        "provider": "gemini",
    }
    monkeypatch.setattr(
        meeting_notes_service,
        "_validate_saved_meeting_note_generation",
        lambda meeting_note_id, emp_code=None: ("gemini", active_record, None),
    )
    monkeypatch.setattr(
        meeting_notes_service,
        "_fetch_active_meeting_note_job",
        lambda meeting_note_id: {"job_id": "mnj_busy_001", "status": "processing"},
    )
    monkeypatch.setattr(meeting_notes_service, "_is_meeting_note_job_stale", lambda job: False)

    response, status_code = meeting_notes_service.queue_meeting_notes_generation_from_saved(
        "mn_force_busy_001",
        emp_code="EMP001",
        force=True,
    )

    assert status_code == 409
    assert response["success"] is False
    assert response["data"]["job_id"] == "mnj_busy_001"
