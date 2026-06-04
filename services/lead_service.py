"""
Lead service proxy.

This backend does not persist leads locally. All lead operations are proxied
to the external CRM service.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

from config import Config

logger = logging.getLogger(__name__)

CRM_BASE_URL = getattr(
    Config,
    "CRM_BASE_URL",
    "https://fawnixverse.acstechnologies.co.in",
).rstrip("/")
CRM_TIMEOUT_SECONDS = getattr(Config, "CRM_TIMEOUT_SECONDS", 20)
CRM_SERVICE_TOKEN = getattr(Config, "CRM_SERVICE_TOKEN", "").strip()
CRM_SSO_EXCHANGE_PATH = getattr(Config, "CRM_SSO_EXCHANGE_PATH", "/api/auth/sso/fawnix").strip() or "/api/auth/sso/fawnix"


def parse_lead_identifier(raw_identifier):
    if raw_identifier in (None, ""):
        return None
    return str(raw_identifier).strip()


def _exchange_fawnix_token_for_verse_token(current_user: dict[str, Any]) -> str | None:
    fawnix_access_token = (current_user.get("_access_token") or "").strip()
    if not fawnix_access_token:
        return None

    url = f"{CRM_BASE_URL}{CRM_SSO_EXCHANGE_PATH}"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {fawnix_access_token}",
                "Content-Type": "application/json",
            },
            timeout=CRM_TIMEOUT_SECONDS,
        )
    except requests.Timeout:
        logger.warning("CRM SSO exchange timed out: %s", url)
        return None
    except requests.RequestException as exc:
        logger.error("CRM SSO exchange failed: %s (%s)", url, exc)
        return None

    if not response.ok:
        logger.warning("CRM SSO exchange rejected with status %s for %s", response.status_code, url)
        return None

    try:
        body = response.json() or {}
    except ValueError:
        logger.warning("CRM SSO exchange returned non-JSON response for %s", url)
        return None

    access_token = str(body.get("accessToken") or "").strip()
    return access_token or None


def _headers(current_user: dict[str, Any], verse_access_token: str | None) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if verse_access_token:
        headers["Authorization"] = f"Bearer {verse_access_token}"
    elif CRM_SERVICE_TOKEN:
        headers["Authorization"] = f"Bearer {CRM_SERVICE_TOKEN}"

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
    verse_access_token = _exchange_fawnix_token_for_verse_token(current_user)
    if not verse_access_token and not CRM_SERVICE_TOKEN:
        return _error("Verse access token exchange failed and CRM service token is not configured", 500)

    url = f"{CRM_BASE_URL}{path}"
    try:
        response = requests.request(
            method,
            url,
            headers=_headers(current_user, verse_access_token),
            params=params,
            json=payload,
            timeout=CRM_TIMEOUT_SECONDS,
        )
    except requests.Timeout:
        logger.warning("CRM request timed out: %s %s", method, url)
        return _error("Lead service timed out", 504)
    except requests.RequestException as exc:
        logger.error("CRM request failed: %s %s (%s)", method, url, exc)
        return _error("Lead service unavailable", 502)

    try:
        body = response.json()
    except ValueError:
        text_body = (response.text or "").strip()
        body = {
            "success": response.ok,
            "message": text_body or "Unexpected response from lead service",
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
                "message": "Lead service request failed",
                "upstreamStatus": response.status_code,
                "upstreamUrl": url,
                "upstreamBody": body,
            }

    return body, response.status_code


def create_lead(current_user, payload):
    return _request(current_user, "POST", "/api/leads", payload=payload)


def list_leads(current_user, filters):
    params = {key: value for key, value in (filters or {}).items() if value not in (None, "", [])}
    user_email = (current_user.get("emp_email") or "").strip()
    if user_email:
        # Force self-scoping so each user only receives their own assigned leads.
        params["assignedTo"] = user_email
    return _request(current_user, "GET", "/api/leads", params=params)


def get_lead(lead_id, current_user):
    lead_identifier = parse_lead_identifier(lead_id)
    return _request(current_user, "GET", f"/api/leads/{lead_identifier}")


def update_lead(lead_id, current_user, payload):
    lead_identifier = parse_lead_identifier(lead_id)
    return _request(current_user, "PUT", f"/api/leads/{lead_identifier}", payload=payload)


def link_lead_field_visit(lead_id, field_visit_id, current_user):
    lead_identifier = parse_lead_identifier(lead_id)
    return _request(
        current_user,
        "POST",
        f"/api/leads/{lead_identifier}/link-field-visit",
        payload={"field_visit_id": field_visit_id},
    )
