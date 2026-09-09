import services.lead_notification_service as lead_notifications
import services.lead_service as lead_service


class DummyResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.ok = 200 <= status_code < 300
        self.text = ""

    def json(self):
        return self._payload


EMPLOYEES = {
    "ASSIGNER": {
        "emp_code": "ASSIGNER",
        "emp_full_name": "Asha Manager",
        "emp_email": "asha@example.com",
        "emp_manager": "MANAGER",
    },
    "ASSIGNEE": {
        "emp_code": "ASSIGNEE",
        "emp_full_name": "Ravi Sales",
        "emp_email": "ravi@example.com",
        "emp_manager": "MANAGER",
    },
    "MANAGER": {
        "emp_code": "MANAGER",
        "emp_full_name": "Meera Lead",
        "emp_email": "meera@example.com",
        "emp_manager": None,
    },
}


def install_employee_lookup(monkeypatch, employees=None):
    employees = employees or EMPLOYEES

    def fake_lookup(identifier):
        if not identifier:
            return None
        value = str(identifier).strip().lower()
        for employee in employees.values():
            if value in {
                str(employee.get("emp_code", "")).lower(),
                str(employee.get("emp_email", "")).lower(),
                str(employee.get("emp_full_name", "")).lower(),
            }:
                return employee
        return None

    monkeypatch.setattr(lead_notifications, "_fetch_active_employee", fake_lookup)


def test_assignment_notifies_assigner_assignee_and_manager(monkeypatch):
    install_employee_lookup(monkeypatch)
    sent = []

    def fake_send(emp_code, title, body, data):
        sent.append((emp_code, title, body, data))
        return {"success": True, "sent_count": 1}

    monkeypatch.setattr(lead_notifications, "send_push_notification_to_employee", fake_send)

    result = lead_notifications.notify_lead_assignment_event(
        "assignment",
        {"id": "lead-1", "name": "Kitchen Remodel", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
    )

    assert result["recipient_count"] == 3
    assert [row[0] for row in sent] == ["ASSIGNER", "ASSIGNEE", "MANAGER"]
    assert sent[0][1] == "Lead assigned"
    assert "Asha Manager assigned Kitchen Remodel to Ravi Sales." == sent[0][2]
    assert sent[0][3]["deep_link"] == "fawnix://leads/lead-1"


def test_reassignment_uses_reassignment_content(monkeypatch):
    install_employee_lookup(monkeypatch)
    sent = []
    monkeypatch.setattr(
        lead_notifications,
        "send_push_notification_to_employee",
        lambda emp_code, title, body, data: sent.append((emp_code, title, body, data)) or {"success": True},
    )

    lead_notifications.notify_lead_assignment_event(
        "reassignment",
        {"id": "lead-2", "name": "Office Fitout", "assignedTo": "ravi@example.com"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        previous_lead={"assignedToUserId": "OLD"},
    )

    assert sent[0][1] == "Lead reassigned"
    assert sent[0][3]["type"] == "reassignment"
    assert "reassigned Office Fitout to Ravi Sales" in sent[0][2]


def test_activity_created_and_updated_notifications(monkeypatch):
    install_employee_lookup(monkeypatch)
    sent = []
    monkeypatch.setattr(
        lead_notifications,
        "send_push_notification_to_employee",
        lambda emp_code, title, body, data: sent.append((emp_code, title, body, data)) or {"success": True},
    )

    lead_notifications.notify_lead_activity_event(
        "activity_created",
        {"id": "lead-3", "name": "Site Visit", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        activity_id=22,
        activity_type="field_visit",
    )
    lead_notifications.notify_lead_activity_event(
        "activity_updated",
        {"id": "lead-3", "name": "Site Visit", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        activity_id=22,
        activity_type="field_visit",
    )

    assert sent[0][1] == "Lead activity created"
    assert sent[0][3]["activity_id"] == 22
    assert sent[3][1] == "Lead activity updated"


def test_duplicate_recipients_are_removed(monkeypatch):
    employees = {
        "ASSIGNER": {**EMPLOYEES["ASSIGNER"], "emp_manager": None},
        "ASSIGNEE": {**EMPLOYEES["ASSIGNEE"], "emp_manager": "ASSIGNER"},
    }
    install_employee_lookup(monkeypatch, employees)
    sent = []
    monkeypatch.setattr(
        lead_notifications,
        "send_push_notification_to_employee",
        lambda emp_code, title, body, data: sent.append(emp_code) or {"success": True},
    )

    result = lead_notifications.notify_lead_assignment_event(
        "assignment",
        {"id": "lead-4", "name": "Dedupe Lead", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
    )

    assert result["recipient_count"] == 2
    assert sent == ["ASSIGNER", "ASSIGNEE"]


def test_missing_manager_or_push_token_does_not_fail(monkeypatch):
    employees = {
        "ASSIGNER": {**EMPLOYEES["ASSIGNER"], "emp_manager": None},
        "ASSIGNEE": {**EMPLOYEES["ASSIGNEE"], "emp_manager": None},
    }
    install_employee_lookup(monkeypatch, employees)
    sent = []

    def fake_send(emp_code, title, body, data):
        sent.append(emp_code)
        if emp_code == "ASSIGNEE":
            return {"success": False, "message": "No active device tokens found"}
        return {"success": True}

    monkeypatch.setattr(lead_notifications, "send_push_notification_to_employee", fake_send)

    result = lead_notifications.notify_lead_assignment_event(
        "assignment",
        {"id": "lead-5", "name": "No Token Lead", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
    )

    assert result["recipient_count"] == 2
    assert sent == ["ASSIGNER", "ASSIGNEE"]
    assert result["attempts"][1]["result"]["success"] is False


def test_notification_service_exception_is_swallowed(monkeypatch):
    install_employee_lookup(monkeypatch)

    def fake_send(emp_code, title, body, data):
        if emp_code == "ASSIGNEE":
            raise RuntimeError("FCM is down")
        return {"success": True}

    monkeypatch.setattr(lead_notifications, "send_push_notification_to_employee", fake_send)

    result = lead_notifications.notify_lead_assignment_event(
        "assignment",
        {"id": "lead-6", "name": "Failure Lead", "assignedToUserId": "ASSIGNEE"},
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
    )

    assert result["success"] is True
    assert result["attempts"][1]["result"]["success"] is False


def test_lead_create_dispatches_assignment_notification(monkeypatch):
    sent = []
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")
    monkeypatch.setattr(
        lead_service.requests,
        "request",
        lambda method, url, headers=None, params=None, json=None, timeout=None: DummyResponse(
            201,
            {"id": "lead-7", "name": "Created Lead", "assignedToUserId": "ASSIGNEE"},
        ),
    )
    monkeypatch.setattr(
        lead_service,
        "notify_lead_assignment_event",
        lambda event_type, lead, actor, **kwargs: sent.append((event_type, lead, actor, kwargs)),
    )

    response, status_code = lead_service.create_lead(
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        {"name": "Created Lead", "assignedToUserId": "ASSIGNEE"},
    )

    assert status_code == 201
    assert response["id"] == "lead-7"
    assert sent[0][0] == "assignment"


def test_lead_update_dispatches_reassignment_notification(monkeypatch):
    responses = [
        DummyResponse(200, {"id": "lead-8", "name": "Reassigned Lead", "assignedToUserId": "OLD"}),
        DummyResponse(200, {"id": "lead-8", "name": "Reassigned Lead", "assignedToUserId": "ASSIGNEE"}),
    ]
    sent = []
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")
    monkeypatch.setattr(
        lead_service.requests,
        "request",
        lambda method, url, headers=None, params=None, json=None, timeout=None: responses.pop(0),
    )
    monkeypatch.setattr(
        lead_service,
        "notify_lead_assignment_event",
        lambda event_type, lead, actor, **kwargs: sent.append((event_type, lead, actor, kwargs)),
    )

    response, status_code = lead_service.update_lead(
        "lead-8",
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        {"assignedToUserId": "ASSIGNEE"},
    )

    assert status_code == 200
    assert response["assignedToUserId"] == "ASSIGNEE"
    assert sent[0][0] == "reassignment"
    assert sent[0][3]["previous_lead"]["assignedToUserId"] == "OLD"


def test_assign_lead_uses_dedicated_assign_endpoint_and_notifies(monkeypatch):
    captured = []
    responses = [
        DummyResponse(200, {"id": "lead-9", "name": "Assign API Lead", "assignedToUserId": None}),
        DummyResponse(200, {"id": "lead-9", "name": "Assign API Lead", "assignedToUserId": "ASSIGNEE"}),
    ]
    sent = []
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured.append((method, url, json))
        return responses.pop(0)

    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(
        lead_service,
        "notify_lead_assignment_event",
        lambda event_type, lead, actor, **kwargs: sent.append((event_type, lead, actor, kwargs)),
    )

    response, status_code = lead_service.assign_lead(
        "lead-9",
        {"emp_code": "ASSIGNER", "emp_full_name": "Asha Manager"},
        {"assignedToUserId": "ASSIGNEE"},
    )

    assert status_code == 200
    assert response["assignedToUserId"] == "ASSIGNEE"
    assert captured[1] == (
        "PATCH",
        f"{lead_service.CRM_BASE_URL}/api/leads/lead-9/assign",
        {"assignedToUserId": "ASSIGNEE"},
    )
    assert sent[0][0] == "assignment"
