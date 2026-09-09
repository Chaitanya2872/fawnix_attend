"""
Lead push-notification orchestration.

This module resolves lead recipients and delegates delivery to the existing
employee push-notification service. Notification failures are deliberately
non-fatal for the lead/activity write paths that call into it.
"""

from __future__ import annotations

import logging
from typing import Any

from database.connection import get_db_connection, return_connection
from services.notification_service import send_push_notification_to_employee

logger = logging.getLogger(__name__)

ASSIGNMENT_EVENTS = {"assignment", "reassignment"}
ACTIVITY_EVENTS = {"activity_created", "activity_updated"}


def assignment_fields_changed(payload: dict[str, Any] | None) -> bool:
    if not isinstance(payload, dict):
        return False

    assignment_keys = {
        "assignedTo",
        "assigned_to",
        "assignedToUserId",
        "assigned_to_user_id",
        "assignedToEmpCode",
        "assigned_to_emp_code",
        "assigned_to_email",
    }
    return any(key in payload for key in assignment_keys)


def assignee_identity(lead_or_payload: dict[str, Any] | None) -> str | None:
    if not isinstance(lead_or_payload, dict):
        return None

    for key in (
        "assignedToEmpCode",
        "assigned_to_emp_code",
        "assignedToUserId",
        "assigned_to_user_id",
        "assignedTo",
        "assigned_to",
        "assigned_to_email",
    ):
        value = lead_or_payload.get(key)
        if value not in (None, ""):
            return str(value).strip() or None
    return None


def lead_identifier(lead: dict[str, Any] | None, fallback: Any = None) -> str | None:
    if isinstance(lead, dict):
        for key in ("id", "lead_id", "leadId", "externalLeadId", "external_lead_id"):
            value = lead.get(key)
            if value not in (None, ""):
                return str(value).strip() or None
    if fallback not in (None, ""):
        return str(fallback).strip() or None
    return None


def lead_display_name(lead: dict[str, Any] | None, fallback_id: Any = None) -> str:
    if isinstance(lead, dict):
        for key in ("name", "lead_name", "leadName", "company"):
            value = lead.get(key)
            if value not in (None, ""):
                return str(value).strip()
    resolved_id = lead_identifier(lead, fallback_id)
    return f"Lead {resolved_id}" if resolved_id else "Lead"


def notify_lead_assignment_event(
    event_type: str,
    lead: dict[str, Any] | None,
    actor: dict[str, Any] | None,
    *,
    previous_lead: dict[str, Any] | None = None,
    fallback_lead_id: Any = None,
) -> dict[str, Any]:
    if event_type not in ASSIGNMENT_EVENTS:
        raise ValueError(f"Unsupported assignment event type: {event_type}")

    return _notify_lead_event(
        event_type,
        lead,
        actor,
        previous_lead=previous_lead,
        fallback_lead_id=fallback_lead_id,
    )


def notify_lead_activity_event(
    event_type: str,
    lead: dict[str, Any] | None,
    actor: dict[str, Any] | None,
    *,
    activity_id: Any = None,
    activity_type: Any = None,
    fallback_lead_id: Any = None,
) -> dict[str, Any]:
    if event_type not in ACTIVITY_EVENTS:
        raise ValueError(f"Unsupported activity event type: {event_type}")

    return _notify_lead_event(
        event_type,
        lead,
        actor,
        activity_id=activity_id,
        activity_type=activity_type,
        fallback_lead_id=fallback_lead_id,
    )


def fetch_lead_for_notification(lead_id: Any, current_user: dict[str, Any] | None) -> dict[str, Any] | None:
    if lead_id in (None, "") or not current_user:
        return None

    try:
        from services.lead_service import get_lead

        body, status_code = get_lead(lead_id, current_user)
        if status_code in range(200, 300) and isinstance(body, dict):
            return body
        logger.warning(
            "Lead notification detail fetch failed lead_id=%s status=%s body=%s",
            lead_id,
            status_code,
            body,
        )
    except Exception:
        logger.exception("Lead notification detail fetch failed lead_id=%s", lead_id)
    return None


def _notify_lead_event(
    event_type: str,
    lead: dict[str, Any] | None,
    actor: dict[str, Any] | None,
    *,
    previous_lead: dict[str, Any] | None = None,
    activity_id: Any = None,
    activity_type: Any = None,
    fallback_lead_id: Any = None,
) -> dict[str, Any]:
    lead_id = lead_identifier(lead, fallback_lead_id)
    lead_name = lead_display_name(lead, lead_id)
    actor_emp_code = _clean(actor.get("emp_code") if actor else None)
    actor_name = _clean((actor or {}).get("emp_full_name")) or _clean((actor or {}).get("name")) or "Someone"

    assignee = _fetch_active_employee(assignee_identity(lead))
    if not assignee:
        assignee = _fetch_active_employee(assignee_identity(previous_lead))
    if not assignee and actor_emp_code:
        assignee = _fetch_active_employee(actor_emp_code)

    actor_employee = _fetch_active_employee(actor_emp_code) if actor_emp_code else None
    manager = _fetch_active_employee(assignee.get("emp_manager")) if assignee and assignee.get("emp_manager") else None

    recipients = _dedupe_recipients(
        [
            ("assignedBy", actor_employee),
            ("assignedTo", assignee),
            ("emp_manager", manager),
        ]
    )

    title, body = _message_for_event(event_type, lead_name, actor_name, assignee)
    data = {
        "type": event_type,
        "lead_id": lead_id,
        "lead_name": lead_name,
        "actor_emp_code": actor_emp_code,
        "actor_name": actor_name,
        "assigned_to_emp_code": assignee.get("emp_code") if assignee else None,
        "assigned_to_name": assignee.get("emp_full_name") if assignee else None,
        "activity_id": activity_id,
        "activity_type": activity_type,
        "screen": "lead_detail",
        "deep_link": f"fawnix://leads/{lead_id}" if lead_id else "fawnix://leads",
    }

    attempts = []
    for role, employee in recipients:
        emp_code = employee["emp_code"]
        try:
            result = send_push_notification_to_employee(emp_code, title, body, data)
            attempts.append({"role": role, "emp_code": emp_code, "result": result})
            if not result.get("success"):
                logger.warning(
                    "Lead push notification failed event=%s lead_id=%s role=%s emp_code=%s message=%s",
                    event_type,
                    lead_id,
                    role,
                    emp_code,
                    result.get("message"),
                )
        except Exception:
            logger.exception(
                "Lead push notification raised event=%s lead_id=%s role=%s emp_code=%s",
                event_type,
                lead_id,
                role,
                emp_code,
            )
            attempts.append({"role": role, "emp_code": emp_code, "result": {"success": False}})

    return {
        "success": True,
        "event_type": event_type,
        "lead_id": lead_id,
        "recipient_count": len(recipients),
        "attempts": attempts,
    }


def _message_for_event(
    event_type: str,
    lead_name: str,
    actor_name: str,
    assignee: dict[str, Any] | None,
) -> tuple[str, str]:
    assignee_name = assignee.get("emp_full_name") if assignee else None

    if event_type == "reassignment":
        title = "Lead reassigned"
        body = f"{actor_name} reassigned {lead_name}"
    elif event_type == "assignment":
        title = "Lead assigned"
        body = f"{actor_name} assigned {lead_name}"
    elif event_type == "activity_created":
        title = "Lead activity created"
        body = f"{actor_name} created an activity for {lead_name}"
    else:
        title = "Lead activity updated"
        body = f"{actor_name} updated an activity for {lead_name}"

    if assignee_name and event_type in ASSIGNMENT_EVENTS:
        body = f"{body} to {assignee_name}"
    elif assignee_name and event_type in ACTIVITY_EVENTS:
        body = f"{body} assigned to {assignee_name}"

    return title, f"{body}."


def _fetch_active_employee(identifier: Any) -> dict[str, Any] | None:
    value = _clean(identifier)
    if not value:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                e.emp_code,
                e.emp_full_name,
                e.emp_email,
                e.emp_manager
            FROM employees e
            LEFT JOIN users u ON u.emp_code = e.emp_code
            WHERE (
                LOWER(TRIM(e.emp_code)) = LOWER(TRIM(%s))
                OR LOWER(TRIM(COALESCE(e.emp_email, ''))) = LOWER(TRIM(%s))
                OR LOWER(TRIM(COALESCE(e.emp_full_name, ''))) = LOWER(TRIM(%s))
                OR CAST(u.id AS TEXT) = %s
            )
              AND COALESCE(u.is_active, TRUE) = TRUE
            ORDER BY
                CASE WHEN LOWER(TRIM(e.emp_code)) = LOWER(TRIM(%s)) THEN 0 ELSE 1 END,
                e.emp_code
            LIMIT 1
            """,
            (value, value, value, value, value),
        )
        return cursor.fetchone()
    except Exception:
        logger.exception("Lead notification employee lookup failed identifier=%s", value)
        return None
    finally:
        cursor.close()
        return_connection(conn)


def _dedupe_recipients(
    recipients: list[tuple[str, dict[str, Any] | None]]
) -> list[tuple[str, dict[str, Any]]]:
    deduped = []
    seen = set()
    for role, employee in recipients:
        if not employee:
            continue
        emp_code = _clean(employee.get("emp_code"))
        if not emp_code or emp_code in seen:
            continue
        seen.add(emp_code)
        deduped.append((role, employee))
    return deduped


def _clean(value: Any) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None
