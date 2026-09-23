import pytest

from services.email_template_service import (
    DynamicEmailRequest,
    EmailService,
    EmailTemplateError,
    EmailTemplateRenderer,
    EmailValidationService,
)


def test_renderer_resolves_subject_and_escapes_html_values():
    renderer = EmailTemplateRenderer()
    assert renderer.render("{{title}} - Notification", {"title": "Update"}, html_output=False) == "Update - Notification"
    assert renderer.render("<p>{{message}}</p>", {"message": "<script>x</script>"}, html_output=True) == "<p>&lt;script&gt;x&lt;/script&gt;</p>"


def test_renderer_rejects_missing_and_unresolved_variables():
    renderer = EmailTemplateRenderer()
    with pytest.raises(EmailTemplateError, match="Missing template variable"):
        renderer.render("Hello {{name}}", {}, html_output=False)
    with pytest.raises(EmailTemplateError, match="unresolved placeholder"):
        renderer.render("Hello {{ invalid-name }}", {}, html_output=False)


def test_recipient_validation_supports_multiple_to_cc_bcc_and_deduplicates():
    to, cc, bcc = EmailValidationService.recipients(
        ["one@example.com", "ONE@example.com", "two@example.com"],
        ["two@example.com", "three@example.com"],
        ["three@example.com", "four@example.com"],
    )
    assert to == ["one@example.com", "two@example.com"]
    assert cc == ["three@example.com"]
    assert bcc == ["four@example.com"]


def test_recipient_validation_accepts_empty_optional_cc_and_bcc():
    assert EmailValidationService.recipients(["to@example.com"], [], []) == (["to@example.com"], [], [])


@pytest.mark.parametrize("address", ["invalid", "@example.com", "name@"])
def test_recipient_validation_rejects_invalid_addresses(address):
    with pytest.raises(EmailTemplateError, match="Invalid To"):
        EmailValidationService.recipients([address], [], [])


class _Templates:
    def get(self, key):
        if key == "disabled":
            raise EmailTemplateError("Email template 'disabled' is inactive.")
        if key == "missing":
            raise EmailTemplateError("Email template 'missing' was not found.")
        return {
            "subject_template": "{{title}} - Notification",
            "html_body": "<h2>Hello {{name}}</h2><p>{{message}}</p>",
            "text_body": "Hello {{name}}\n{{message}}",
        }


def test_email_service_does_not_send_when_template_is_disabled_or_missing(monkeypatch):
    service = EmailService(_Templates())
    monkeypatch.setattr(service, "_audit", lambda *args, **kwargs: None)
    monkeypatch.setattr(service, "_deliver", lambda *args, **kwargs: pytest.fail("must not send"))
    for key in ("disabled", "missing"):
        with pytest.raises(EmailTemplateError):
            service.send(DynamicEmailRequest(template_key=key, to=["to@example.com"]))


def test_email_service_passes_separate_to_cc_and_bcc_to_provider(monkeypatch):
    service = EmailService(_Templates())
    captured = {}
    monkeypatch.setattr(service, "_audit", lambda *args, **kwargs: None)
    monkeypatch.setattr(service, "_deliver", lambda subject, html, text, to, cc, bcc: captured.update(subject=subject, html=html, text=text, to=to, cc=cc, bcc=bcc) or "msg_1")
    result = service.send(DynamicEmailRequest(
        template_key="generic", to=["to@example.com"], cc=["cc@example.com"], bcc=["bcc@example.com"],
        variables={"title": "Alert", "name": "User", "message": "<unsafe>"},
    ))
    assert result["success"] is True
    assert captured["subject"] == "Alert - Notification"
    assert captured["to"] == ["to@example.com"]
    assert captured["cc"] == ["cc@example.com"]
    assert captured["bcc"] == ["bcc@example.com"]
    assert "&lt;unsafe&gt;" in captured["html"]


def test_email_service_surfaces_provider_failure_without_sending_response_details(monkeypatch):
    service = EmailService(_Templates())
    audit = []
    monkeypatch.setattr(service, "_audit", lambda *args: audit.append(args))
    monkeypatch.setattr(service, "_deliver", lambda *args: (_ for _ in ()).throw(OSError("connection refused")))
    with pytest.raises(RuntimeError, match="provider delivery failed"):
        service.send(DynamicEmailRequest(
            template_key="generic", to=["to@example.com"],
            variables={"title": "Alert", "name": "User", "message": "Message"},
        ))
    assert audit[-1][-2:] == ("failed", "connection refused")
