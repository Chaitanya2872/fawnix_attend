from datetime import date, datetime, timezone

import pytest

from config import Config
from services import email_template_service as ets
from services.email_template_service import EmailService, EmailTemplateError
from services.email_trigger_service import EmailTriggerService, _resolve_recipients, next_cron_run


class _FakeEmail:
    def __init__(self):
        self.requests = []
        self.templates = self

    def get(self, key, require_active=True):
        return {"template_key": key}

    def send(self, request):
        self.requests.append(request)
        return {"success": True, "status": "sent"}


def _trigger(**extra):
    return {"trigger_key": "leave_mail", "template_key": "LEAVE", "trigger_type": "event",
            "to_recipients": ["{{manager_email}}"], "cc_recipients": ["{{employee_email}}", "hr@example.com"],
            "bcc_recipients": [], "variables": {"company": "Fawnix", "notes": "default"}, **extra}


def _service(monkeypatch):
    fake = _FakeEmail()
    service = EmailTriggerService(fake)
    recorded = []
    monkeypatch.setattr(service, "_record", lambda key, status, error: recorded.append(status))
    return service, fake, recorded


def test_recipient_placeholders_resolve_and_blank_values_are_dropped():
    assert _resolve_recipients(["{{a}}", "{{missing}}", "x@example.com, {{b}}"], {"a": "a@example.com", "b": None}) == [
        "a@example.com", "x@example.com"]


def test_event_run_merges_variables_and_resolves_recipients(monkeypatch):
    service, fake, recorded = _service(monkeypatch)
    service.run(_trigger(), {"manager_email": "m@example.com", "employee_email": "e@example.com",
                             "from_date": date(2026, 9, 23), "notes": "from event"}, reference_id="7")
    request = fake.requests[0]
    assert request.to == ["m@example.com"]
    assert request.cc == ["e@example.com", "hr@example.com"]
    assert request.variables["company"] == "Fawnix"
    assert request.variables["notes"] == "from event"
    assert request.variables["from_date"] == "23-09-2026"
    assert request.source_service == "trigger:leave_mail" and request.reference_id == "7"
    assert recorded == ["sent"]


def test_run_is_skipped_when_no_to_recipient_resolves(monkeypatch):
    service, fake, recorded = _service(monkeypatch)
    result = service.run(_trigger(), {})
    assert result["status"] == "skipped" and not fake.requests and recorded == ["skipped"]


def test_manual_run_overrides_recipients_and_variables(monkeypatch):
    service, fake, _ = _service(monkeypatch)
    service.run(_trigger(trigger_type="manual"), overrides={"to": "a@example.com\nb@example.com", "variables": {"notes": "manual"}})
    assert fake.requests[0].to == ["a@example.com", "b@example.com"]
    assert fake.requests[0].variables["notes"] == "manual"


def test_dispatch_event_isolates_failing_triggers(monkeypatch):
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setattr(service, "_query", lambda sql, params=(): [_trigger(trigger_key="bad", to_recipients=["bad"]), _trigger()])
    calls = []
    def run(trigger, context, reference_id=None):
        calls.append(trigger["trigger_key"])
        if trigger["trigger_key"] == "bad":
            raise RuntimeError("provider down")
        return {"success": True}
    monkeypatch.setattr(service, "run", run)
    assert service.dispatch_event("leave.applied", {}) == 1
    assert calls == ["bad", "leave_mail"]


def test_next_cron_run_and_invalid_expression():
    after = datetime(2026, 9, 23, 0, 0, tzinfo=timezone.utc)
    assert next_cron_run("0 9 * * *", after) > after
    with pytest.raises(EmailTemplateError, match="Invalid cron"):
        next_cron_run("every day", after)


def test_save_validates_trigger_shape(monkeypatch):
    service, _, _ = _service(monkeypatch)
    with pytest.raises(EmailTemplateError, match="eventName"):
        service.create({"triggerKey": "k", "triggerName": "n", "templateKey": "T", "triggerType": "event", "eventName": "nope", "toRecipients": ["a@b.co"]})
    with pytest.raises(EmailTemplateError, match="scheduleCron"):
        service.create({"triggerKey": "k", "triggerName": "n", "templateKey": "T", "triggerType": "schedule", "toRecipients": ["a@b.co"]})


class _Response:
    def __init__(self, status, body):
        self.status_code, self._body, self.text = status, body, str(body)

    def json(self):
        return self._body


def test_resend_provider_posts_expected_payload(monkeypatch):
    monkeypatch.setattr(Config, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(Config, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(Config, "RESEND_FROM", "Fawnix <noreply@example.com>")
    monkeypatch.setattr(Config, "RESEND_REPLY_TO", "")
    captured = {}
    def post(url, json, headers, timeout):
        captured.update(url=url, json=json, headers=headers)
        return _Response(200, {"id": "msg_123"})
    monkeypatch.setattr(ets.requests, "post", post)
    message_id = EmailService(templates=object())._deliver("Hi", "<p>x</p>", "x", ["t@example.com"], ["c@example.com"], [])
    assert message_id == "msg_123"
    assert captured["headers"]["Authorization"] == "Bearer re_test"
    assert captured["json"] == {"from": "Fawnix <noreply@example.com>", "to": ["t@example.com"], "cc": ["c@example.com"],
                                "subject": "Hi", "html": "<p>x</p>", "text": "x"}


def test_resend_provider_surfaces_api_errors(monkeypatch):
    monkeypatch.setattr(Config, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(Config, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(Config, "RESEND_FROM", "noreply@example.com")
    monkeypatch.setattr(ets.requests, "post", lambda *a, **k: _Response(403, {"message": "domain not verified"}))
    with pytest.raises(RuntimeError, match="domain not verified"):
        EmailService(templates=object())._deliver("Hi", None, "x", ["t@example.com"], [], [])


def test_lazy_event_context_is_only_built_when_a_trigger_listens(monkeypatch):
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setattr(service, "_query", lambda sql, params=(): [])
    assert service.dispatch_event("compoff.requested", lambda: pytest.fail("must not build context")) == 0
    monkeypatch.setattr(service, "_query", lambda sql, params=(): [_trigger()])
    assert service.dispatch_event("compoff.requested", lambda: {"manager_email": "m@example.com"}) == 1
    assert fake.requests[0].to == ["m@example.com"]


def test_blank_event_values_fall_back_to_trigger_defaults(monkeypatch):
    service, fake, _ = _service(monkeypatch)
    service.run(_trigger(variables={"planned_time": "not specified"}), {"manager_email": "m@example.com", "planned_time": None})
    assert fake.requests[0].variables["planned_time"] == "not specified"


def test_designation_recipients_expand_to_employee_emails(monkeypatch):
    from services import email_trigger_service as mod
    lookups = {"CMD": [{"emp_email": "cmd@example.com"}], "HR MANAGER": [{"emp_email": "hrm@example.com"}]}
    monkeypatch.setattr(mod.EmailTriggerService, "_query", staticmethod(lambda sql, params=(): lookups.get(params[0], [])))
    assert mod._expand_designations(["{{employee_email}}", "designation:CMD", "designation:hr manager"]) == [
        "{{employee_email}}", "cmd@example.com"]
    assert mod._expand_designations(["designation:HR MANAGER"]) == ["hrm@example.com"]


def test_audience_schedule_sends_one_email_per_person(monkeypatch):
    from services import email_trigger_service as mod
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setitem(mod.AUDIENCE_LOADERS, "employees_not_clocked_in", lambda run_date: [
        {"employee_code": "E1", "employee_email": "e1@example.com"}, {"employee_code": "E2", "employee_email": "e2@example.com"}])
    monkeypatch.setattr(mod, "_expand_designations", lambda entries: [
        {"designation:CMD": "cmd@example.com", "designation:HR MANAGER": "hrm@example.com"}.get(e, e) for e in entries or []])
    trigger = _trigger(trigger_type="schedule", audience="employees_not_clocked_in", to_recipients=["{{employee_email}}"],
                       cc_recipients=["designation:CMD"], bcc_recipients=["designation:HR MANAGER"])
    monkeypatch.setattr(mod.time, "sleep", lambda seconds: None)
    assert service._run_scheduled(trigger) == (2, 0)
    assert [(r.to, r.cc, r.bcc) for r in fake.requests] == [
        (["e1@example.com"], ["cmd@example.com"], ["hrm@example.com"]),
        (["e2@example.com"], ["cmd@example.com"], ["hrm@example.com"])]
    assert fake.requests[0].reference_id.startswith("E1:")


def test_manual_test_run_uses_sample_employee_and_only_dialog_recipients(monkeypatch):
    from services import email_trigger_service as mod
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setitem(mod.AUDIENCE_LOADERS, "employees_not_clocked_in", lambda run_date: [
        {"employee_code": "E1", "employee_name": "Asha", "employee_email": "asha@example.com"}])
    monkeypatch.setattr(mod, "_expand_designations", lambda entries: pytest.fail("designations must not expand in a test run")
                        if any(str(e).startswith("designation:") for e in entries or []) else list(entries or []))
    trigger = _trigger(trigger_type="schedule", audience="employees_not_clocked_in", to_recipients=["{{employee_email}}"],
                       cc_recipients=["designation:CMD"], bcc_recipients=["designation:HR MANAGER"])
    service.run_manual(trigger, {"to": ["me@example.com"], "cc": [], "bcc": []}, admin_emp_code="ADMIN")
    request = fake.requests[0]
    assert (request.to, request.cc, request.bcc) == (["me@example.com"], [], [])
    assert request.variables["employee_name"] == "Asha"


def test_skip_message_names_the_unresolved_recipient(monkeypatch):
    service, _, _ = _service(monkeypatch)
    assert "{{employee_email}}" in service.run(_trigger(to_recipients=["{{employee_email}}"]), {})["message"]


def test_resend_retries_when_rate_limited(monkeypatch):
    monkeypatch.setattr(Config, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(Config, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(Config, "RESEND_FROM", "noreply@example.com")
    monkeypatch.setattr(ets.time, "sleep", lambda seconds: None)
    responses = [_Response(429, {"message": "Too many requests"}), _Response(200, {"id": "msg_2"})]
    for r in responses:
        r.headers = {}
    monkeypatch.setattr(ets.requests, "post", lambda *a, **k: responses.pop(0))
    assert EmailService(templates=object())._deliver("Hi", None, "x", ["t@example.com"], [], []) == "msg_2"


def test_run_now_fires_audience_trigger_live_with_configured_recipients(monkeypatch):
    from services import email_trigger_service as mod
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setattr(mod.time, "sleep", lambda seconds: None)
    monkeypatch.setitem(mod.AUDIENCE_LOADERS, "employees_not_clocked_in", lambda run_date: [
        {"employee_code": "E1", "employee_email": "e1@example.com", "manager_email": "m1@example.com"}])
    monkeypatch.setattr(mod, "_expand_designations", lambda entries: [
        {"designation:CMD": "cmd@example.com", "designation:HR MANAGER": "hrm@example.com"}.get(e, e) for e in entries or []])
    trigger = _trigger(trigger_type="schedule", audience="employees_not_clocked_in", to_recipients=["{{employee_email}}"],
                       cc_recipients=["{{manager_email}}", "designation:CMD"], bcc_recipients=["designation:HR MANAGER"])
    result = service.run_now(trigger)
    assert result["sent"] == 1 and result["message"] == "Sent 1 email(s)."
    request = fake.requests[0]
    assert (request.to, request.cc, request.bcc) == (["e1@example.com"], ["m1@example.com", "cmd@example.com"], ["hrm@example.com"])


def test_run_now_reports_when_nobody_matches(monkeypatch):
    from services import email_trigger_service as mod
    service, fake, _ = _service(monkeypatch)
    monkeypatch.setitem(mod.AUDIENCE_LOADERS, "employees_not_clocked_in", lambda run_date: [])
    result = service.run_now(_trigger(trigger_type="schedule", audience="employees_not_clocked_in"))
    assert result["status"] == "skipped" and not fake.requests
