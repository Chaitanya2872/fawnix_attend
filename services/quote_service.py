"""
Sales quote (quotation) service proxy.

Quotations are a first-class module in sales-service (behind the same API
gateway used for CRM leads, see config.CRM_BASE_URL) - not something this
backend should own locally. This proxies to /api/sales/quotes so the mobile
app can build/view quotes for a lead without duplicating that module. All
totals are computed by sales-service itself; this layer only forwards.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

from config import Config

logger = logging.getLogger(__name__)

SALES_BASE_URL = getattr(
    Config,
    "CRM_BASE_URL",
    "https://fawnixverse.acstechnologies.co.in",
).rstrip("/")
SALES_TIMEOUT_SECONDS = getattr(Config, "CRM_TIMEOUT_SECONDS", 20)
SALES_SERVICE_TOKEN = getattr(Config, "CRM_SERVICE_TOKEN", "").strip()
SALES_SSO_EXCHANGE_PATH = getattr(Config, "CRM_SSO_EXCHANGE_PATH", "/api/auth/sso/fawnix").strip() or "/api/auth/sso/fawnix"


def _resolve_verse_access_token(current_user: dict[str, Any]) -> str | None:
    if (current_user.get("_access_token_source") or "").strip().lower() == "verse":
        token = (current_user.get("_access_token") or "").strip()
        return token or None

    fawnix_access_token = (current_user.get("_access_token") or "").strip()
    if not fawnix_access_token:
        return None

    url = f"{SALES_BASE_URL}{SALES_SSO_EXCHANGE_PATH}"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {fawnix_access_token}",
                "Content-Type": "application/json",
            },
            timeout=SALES_TIMEOUT_SECONDS,
        )
    except requests.Timeout:
        logger.warning("Sales SSO exchange timed out: %s", url)
        return None
    except requests.RequestException as exc:
        logger.error("Sales SSO exchange failed: %s (%s)", url, exc)
        return None

    if not response.ok:
        logger.warning("Sales SSO exchange rejected with status %s for %s", response.status_code, url)
        return None

    try:
        body = response.json() or {}
    except ValueError:
        logger.warning("Sales SSO exchange returned non-JSON response for %s", url)
        return None

    access_token = str(body.get("accessToken") or "").strip()
    return access_token or None


def _headers(current_user: dict[str, Any], verse_access_token: str | None) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if verse_access_token:
        headers["Authorization"] = f"Bearer {verse_access_token}"
    elif SALES_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {SALES_SERVICE_TOKEN}"

    user_email = (current_user.get("emp_email") or "").strip()
    if user_email:
        headers["X-Authenticated-User-Email"] = user_email

    user_id = current_user.get("id", current_user.get("user_id"))
    if user_id not in (None, ""):
        headers["X-Authenticated-User-Id"] = str(user_id)

    return headers


def _error(message: str, status_code: int):
    return {"success": False, "message": message}, status_code


def _request(current_user, method: str, path: str, *, params=None, payload=None):
    verse_access_token = _resolve_verse_access_token(current_user)
    if not verse_access_token and not SALES_SERVICE_TOKEN:
        return _error("Verse access token exchange failed and sales service token is not configured", 500)

    url = f"{SALES_BASE_URL}{path}"
    try:
        response = requests.request(
            method,
            url,
            headers=_headers(current_user, verse_access_token),
            params=params,
            json=payload,
            timeout=SALES_TIMEOUT_SECONDS,
        )
    except requests.Timeout:
        logger.warning("Sales request timed out: %s %s", method, url)
        return _error("Quotation service timed out", 504)
    except requests.RequestException as exc:
        logger.error("Sales request failed: %s %s (%s)", method, url, exc)
        return _error("Quotation service unavailable", 502)

    try:
        body = response.json()
    except ValueError:
        text_body = (response.text or "").strip()
        body = {
            "success": response.ok,
            "message": text_body or "Unexpected response from quotation service",
            "upstreamStatus": response.status_code,
            "upstreamUrl": url,
        }
        if text_body:
            body["upstreamBody"] = text_body

    if not response.ok:
        if isinstance(body, dict):
            body.setdefault("success", False)
            body.setdefault("upstreamStatus", response.status_code)
            body.setdefault("upstreamUrl", url)
        else:
            body = {
                "success": False,
                "message": "Quotation service request failed",
                "upstreamStatus": response.status_code,
                "upstreamUrl": url,
                "upstreamBody": body,
            }

    return body, response.status_code


def list_quotes_for_lead(lead_id: str, current_user, page: int = 1, page_size: int = 50):
    return _request(
        current_user,
        "GET",
        "/api/sales/quotes",
        params={"leadId": lead_id, "status": "ALL", "page": page, "pageSize": page_size},
    )


def get_quote(quote_id: str, current_user):
    return _request(current_user, "GET", f"/api/sales/quotes/{quote_id}")


def create_quote_for_lead(lead_id: str, current_user, payload: dict):
    body = dict(payload or {})
    body["leadId"] = lead_id
    return _request(current_user, "POST", "/api/sales/quotes", payload=body)


def update_quote(quote_id: str, current_user, payload: dict):
    return _request(current_user, "PATCH", f"/api/sales/quotes/{quote_id}", payload=payload)
