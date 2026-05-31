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


def parse_lead_identifier(raw_identifier):
    if raw_identifier in (None, ""):
        return None
    return str(raw_identifier).strip()


def _headers(current_user: dict[str, Any]) -> dict[str, str]:
    token = current_user.get("access_token") or current_user.get("_access_token")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _error(message: str, status_code: int):
    return {"success": False, "message": message}, status_code


def _request(current_user, method: str, path: str, *, params=None, payload=None):
    url = f"{CRM_BASE_URL}{path}"
    try:
        response = requests.request(
            method,
            url,
            headers=_headers(current_user),
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
        body = {
            "success": response.ok,
            "message": response.text or "Unexpected response from lead service",
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
