from unittest.mock import Mock

import services.whatsapp_service as whatsapp_service


def test_send_exception_notification_uses_body_only_template_components(monkeypatch):
    monkeypatch.setattr(whatsapp_service.Config, "WHATSAPP_TOKEN", "token")
    monkeypatch.setattr(whatsapp_service.Config, "PHONE_NUMBER_ID", "12345")
    monkeypatch.setattr(whatsapp_service.Config, "WHATSAPP_EXCEPTION_TEMPLATE", "fawnix_notes")

    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["payload"] = json
        response = Mock()
        response.status_code = 200
        response.text = "ok"
        return response

    monkeypatch.setattr(whatsapp_service.requests, "post", fake_post)

    result = whatsapp_service.send_exception_notification(
        phone_number="9876543210",
        title="Attendance Exception",
        message_body="body",
        template_parameters=[
            "Manager",
            "Employee",
            "early leave",
            "20",
            "early leave",
            "Traffic",
            "leave",
            "16:30",
        ],
    )

    assert result is True
    assert captured["payload"]["template"]["name"] == "fawnix_notes"
    assert len(captured["payload"]["template"]["components"]) == 1
    assert captured["payload"]["template"]["components"][0]["type"] == "body"
    assert len(captured["payload"]["template"]["components"][0]["parameters"]) == 8
