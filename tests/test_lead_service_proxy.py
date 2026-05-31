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


def test_create_lead_proxies_to_crm(monkeypatch):
    captured = {}

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured.update(
            {
                "method": method,
                "url": url,
                "headers": headers,
                "params": params,
                "json": json,
                "timeout": timeout,
            }
        )
        return DummyResponse(status_code=201, payload={"id": "lead-123"})

    monkeypatch.setattr(lead_service.requests, "request", fake_request)

    current_user = {"_access_token": "jwt-token"}
    payload = {"name": "Ravi Kumar"}

    response, status_code = lead_service.create_lead(current_user, payload)

    assert status_code == 201
    assert response == {"id": "lead-123"}
    assert captured["method"] == "POST"
    assert captured["url"] == f"{lead_service.CRM_BASE_URL}/api/leads"
    assert captured["headers"]["Authorization"] == "Bearer jwt-token"
    assert captured["json"] == payload


def test_list_leads_forwards_query_params(monkeypatch):
    captured = {}

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured["params"] = params
        return DummyResponse(payload={"data": []})

    monkeypatch.setattr(lead_service.requests, "request", fake_request)

    response, status_code = lead_service.list_leads(
        {"_access_token": "jwt-token", "emp_email": "john@example.com"},
        {"assignedTo": "user-101", "page": "1", "pageSize": "20", "empty": ""},
    )

    assert status_code == 200
    assert response == {"data": []}
    assert captured["params"] == {"assignedTo": "john@example.com", "page": "1", "pageSize": "20"}
