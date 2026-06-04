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

    def fake_post(url, headers=None, timeout=None):
        captured["exchange"] = {
            "url": url,
            "headers": headers,
            "timeout": timeout,
        }
        return DummyResponse(payload={"accessToken": "verse-token"})

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

    monkeypatch.setattr(lead_service.requests, "post", fake_post)
    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "")

    current_user = {"_access_token": "jwt-token", "emp_email": "john@example.com", "id": "99"}
    payload = {"name": "Ravi Kumar"}

    response, status_code = lead_service.create_lead(current_user, payload)

    assert status_code == 201
    assert response == {"id": "lead-123"}
    assert captured["exchange"]["url"] == f"{lead_service.CRM_BASE_URL}{lead_service.CRM_SSO_EXCHANGE_PATH}"
    assert captured["exchange"]["headers"]["Authorization"] == "Bearer jwt-token"
    assert captured["method"] == "POST"
    assert captured["url"] == f"{lead_service.CRM_BASE_URL}/api/leads"
    assert captured["headers"]["Authorization"] == "Bearer verse-token"
    assert captured["headers"]["X-Authenticated-User-Email"] == "john@example.com"
    assert captured["headers"]["X-Authenticated-User-Id"] == "99"
    assert captured["json"] == payload


def test_list_leads_forwards_query_params(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, timeout=None):
        return DummyResponse(payload={"accessToken": "verse-token"})

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured["params"] = params
        captured["headers"] = headers
        return DummyResponse(payload={"data": []})

    monkeypatch.setattr(lead_service.requests, "post", fake_post)
    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "")

    response, status_code = lead_service.list_leads(
        {"_access_token": "jwt-token", "emp_email": "john@example.com"},
        {"assignedTo": "user-101", "page": "1", "pageSize": "20", "empty": ""},
    )

    assert status_code == 200
    assert response == {"data": []}
    assert captured["params"] == {"assignedTo": "john@example.com", "page": "1", "pageSize": "20"}
    assert captured["headers"]["Authorization"] == "Bearer verse-token"


def test_list_leads_surfaces_upstream_error_details(monkeypatch):
    def fake_post(url, headers=None, timeout=None):
        return DummyResponse(payload={"accessToken": "verse-token"})

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        return DummyResponse(
            status_code=401,
            payload={"message": "Unauthorized from CRM"},
        )

    monkeypatch.setattr(lead_service.requests, "post", fake_post)
    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "")

    response, status_code = lead_service.list_leads(
        {"_access_token": "jwt-token", "emp_email": "john@example.com"},
        {},
    )

    assert status_code == 401
    assert response["success"] is False
    assert response["message"] == "Unauthorized from CRM"
    assert response["upstreamStatus"] == 401
    assert response["upstreamUrl"] == f"{lead_service.CRM_BASE_URL}/api/leads"


def test_proxy_fails_fast_when_service_token_missing(monkeypatch):
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "")
    monkeypatch.setattr(lead_service.requests, "post", lambda *args, **kwargs: DummyResponse(status_code=401, payload={"message": "exchange failed"}))

    response, status_code = lead_service.list_leads(
        {"_access_token": "jwt-token", "emp_email": "john@example.com"},
        {},
    )

    assert status_code == 500
    assert response["success"] is False
    assert response["message"] == "Verse access token exchange failed and CRM service token is not configured"


def test_proxy_falls_back_to_service_token_when_exchange_fails(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, timeout=None):
        return DummyResponse(status_code=401, payload={"message": "exchange failed"})

    def fake_request(method, url, headers=None, params=None, json=None, timeout=None):
        captured["headers"] = headers
        return DummyResponse(payload={"data": []})

    monkeypatch.setattr(lead_service.requests, "post", fake_post)
    monkeypatch.setattr(lead_service.requests, "request", fake_request)
    monkeypatch.setattr(lead_service, "CRM_SERVICE_TOKEN", "service-token")

    response, status_code = lead_service.list_leads(
        {"_access_token": "jwt-token", "emp_email": "john@example.com"},
        {},
    )

    assert status_code == 200
    assert response == {"data": []}
    assert captured["headers"]["Authorization"] == "Bearer service-token"
