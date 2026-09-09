import services.lead_service as lead_service


class DummyResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text
        self.ok = 200 <= status_code < 300

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


def test_add_remark_posts_content_to_crm(monkeypatch):
    captured = {}

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured.update({"method": method, "url": url, "json": json})
        return DummyResponse(status_code=201, payload={"id": "remark-1", "content": "Called client"})

    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")

    response, status_code = lead_service.add_remark(
        "lead-123",
        {"emp_email": "john@example.com"},
        "Called client",
    )

    assert status_code == 201
    assert response == {"id": "remark-1", "content": "Called client"}
    assert captured["method"] == "POST"
    assert captured["url"] == f"{lead_service.CRM_BASE_URL}/api/leads/lead-123/remarks"
    assert captured["json"] == {"content": "Called client"}


def test_edit_remark_patches_specific_remark(monkeypatch):
    captured = {}

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured.update({"method": method, "url": url, "json": json})
        return DummyResponse(payload={"id": "remark-1", "content": "Updated"})

    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")

    response, status_code = lead_service.edit_remark(
        "lead-123",
        "remark-1",
        {"emp_email": "john@example.com"},
        "Updated",
    )

    assert status_code == 200
    assert response["content"] == "Updated"
    assert captured["method"] == "PATCH"
    assert captured["url"] == f"{lead_service.CRM_BASE_URL}/api/leads/lead-123/remarks/remark-1"
    assert captured["json"] == {"content": "Updated"}
