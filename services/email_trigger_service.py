"""Email triggers: fire templates manually, on application events, or on a cron schedule.

Application code emits events with ``emit_email_event("leave.applied", {...})``. Every
active ``event`` trigger bound to that event name sends its template, with the event
context available both as template variables and as recipient placeholders such as
``{{employee_email}}``. Delivery runs on a small background pool so request handlers are
never slowed down or broken by the email provider.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from decimal import Decimal
import logging
import os
import re
from typing import Any, Callable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.triggers.cron import CronTrigger
from psycopg2.extras import Json

from database.connection import get_db_connection, return_connection
from services.email_template_service import DynamicEmailRequest, EmailService, EmailTemplateError

logger = logging.getLogger(__name__)

TRIGGER_TYPES = {"manual", "event", "schedule"}

_PEOPLE = ["employee_code", "employee_name", "employee_email", "manager_code", "manager_name", "manager_email"]
_LEAVE = _PEOPLE + ["leave_id", "leave_type", "duration", "from_date", "to_date", "leave_count"]
_EXCEPTION = _PEOPLE + ["exception_id", "exception_type", "exception_type_label", "exception_date", "planned_time",
                        "minutes", "reason", "notes", "status"]
_COMPOFF = _PEOPLE + ["request_id", "total_comp_days", "approval_level", "reason", "notes", "status"]
_COMPOFF_AVAIL = _PEOPLE + ["avail_request_id", "avail_date", "avail_type", "requested_days", "remarks", "status"]
_REVIEW = ["reviewer_code", "reviewer_remarks"]

# Events the application currently emits. Keep this in sync with emit_email_event() calls;
# the admin UI uses it to offer choices and document the available variables.
EMAIL_EVENTS: dict[str, dict[str, Any]] = {
    "leave.applied": {"label": "Leave applied", "variables": _LEAVE + ["notes"]},
    "leave.approved": {"label": "Leave approved", "variables": _LEAVE + ["remarks", "status"]},
    "leave.rejected": {"label": "Leave rejected", "variables": _LEAVE + ["remarks", "status"]},
    "leave.cancelled": {"label": "Leave cancelled", "variables": _LEAVE + ["status"]},
    "attendance_exception.requested": {"label": "Late arrival / early leave requested", "variables": _EXCEPTION},
    "attendance_exception.approved": {"label": "Late arrival / early leave approved", "variables": _EXCEPTION + _REVIEW},
    "attendance_exception.rejected": {"label": "Late arrival / early leave rejected", "variables": _EXCEPTION + _REVIEW},
    "attendance_exception.cancelled": {"label": "Late arrival / early leave cancelled", "variables": _EXCEPTION},
    "compoff.requested": {"label": "Comp-off requested", "variables": _COMPOFF},
    "compoff.approved": {"label": "Comp-off approved", "variables": _COMPOFF + _REVIEW},
    "compoff.rejected": {"label": "Comp-off rejected", "variables": _COMPOFF + _REVIEW},
    "compoff.cancelled": {"label": "Comp-off cancelled", "variables": _COMPOFF},
    "compoff_avail.requested": {"label": "Comp-off avail requested", "variables": _COMPOFF_AVAIL},
    "compoff_avail.approved": {"label": "Comp-off avail approved", "variables": _COMPOFF_AVAIL + _REVIEW},
    "compoff_avail.rejected": {"label": "Comp-off avail rejected", "variables": _COMPOFF_AVAIL + _REVIEW},
}

# Audiences let a schedule trigger send one email per matching person on each run.
AUDIENCES: dict[str, dict[str, Any]] = {
    "employees_not_clocked_in": {
        "label": "Employees not clocked in yet (skips leave, late-arrival requests, holidays)",
        "variables": _PEOPLE + ["employee_designation", "run_date", "run_time"],
    },
}

_DESIGNATION_PREFIX = "designation:"
_PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="email-trigger")


def trigger_timezone():
    name = os.getenv("EMAIL_TRIGGER_TIMEZONE") or os.getenv("AUTO_CLOCKOUT_TIMEZONE", "Asia/Kolkata")
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        logger.warning("Invalid email trigger timezone %r; using UTC.", name)
        return timezone.utc


def next_cron_run(expression: str, after: datetime | None = None) -> datetime:
    try:
        cron = CronTrigger.from_crontab(expression.strip(), timezone=trigger_timezone())
    except (ValueError, AttributeError) as exc:
        raise EmailTemplateError(f"Invalid cron expression {expression!r}: use 5 fields, e.g. '0 9 * * 1-5'.") from exc
    now = after or datetime.now(timezone.utc)
    return cron.get_next_fire_time(None, now)


def _stringify(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.strftime("%d-%m-%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d-%m-%Y")
    if isinstance(value, Decimal):
        return format(value.normalize(), "f")
    return value


def _resolve_recipients(entries: Any, variables: dict[str, Any]) -> list[str]:
    """Substitute placeholders in recipient entries; unresolved or blank entries are dropped."""
    result: list[str] = []
    for entry in entries or []:
        resolved = _PLACEHOLDER.sub(lambda m: str(variables.get(m.group(1)) or ""), str(entry or ""))
        result.extend(part.strip() for part in re.split(r"[,;]", resolved) if part.strip())
    return result


def _expand_designations(entries: Any) -> list[str]:
    """Replace 'designation:CMD' entries with the emails of active employees holding that designation."""
    result: list[str] = []
    for entry in entries or []:
        text = str(entry or "").strip()
        if not text.lower().startswith(_DESIGNATION_PREFIX):
            result.append(text)
            continue
        designation = text[len(_DESIGNATION_PREFIX):].strip()
        rows = EmailTriggerService._query("""
            SELECT e.emp_email FROM employees e LEFT JOIN users u ON u.emp_code = e.emp_code
            WHERE UPPER(TRIM(e.emp_designation)) = UPPER(%s) AND COALESCE(u.is_active, TRUE)
              AND COALESCE(TRIM(e.emp_email), '') <> ''
            ORDER BY e.emp_email""", (designation,))
        if not rows:
            logger.warning("No active employee has designation %r for email recipients", designation)
        result.extend(row["emp_email"] for row in rows)
    return result


def employees_not_clocked_in(run_date: date) -> list[dict[str, Any]]:
    """Active employees with no attendance today who are not on leave and have no late-arrival request."""
    from services.CompLeaveService import is_working_day  # local import: CompLeaveService imports this module

    rows = EmailTriggerService._query("""
        SELECT e.emp_code, e.emp_full_name, e.emp_email, e.emp_designation, e.emp_manager,
               m.emp_full_name AS manager_name, m.emp_email AS manager_email
        FROM employees e
        LEFT JOIN users u ON u.emp_code = e.emp_code
        LEFT JOIN employees m ON m.emp_code = e.emp_manager
        WHERE COALESCE(u.is_active, TRUE)
          AND COALESCE(TRIM(e.emp_email), '') <> ''
          AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.employee_email = e.emp_email AND a.date = %s)
          AND NOT EXISTS (SELECT 1 FROM leaves l WHERE l.emp_code = e.emp_code
                          AND l.status IN ('pending', 'approved') AND %s BETWEEN l.from_date AND l.to_date)
          AND NOT EXISTS (SELECT 1 FROM attendance_exceptions ae WHERE ae.emp_code = e.emp_code
                          AND ae.exception_type = 'late_arrival' AND ae.exception_date = %s
                          AND ae.status IN ('pending', 'approved'))
        ORDER BY e.emp_full_name""", (run_date, run_date, run_date))
    people = []
    for row in rows:
        try:
            working, _ = is_working_day(run_date, row["emp_code"])
        except Exception:
            logger.exception("Working-day check failed for %s; including them", row["emp_code"])
            working = True
        if working:
            people.append({"employee_code": row["emp_code"], "employee_name": row["emp_full_name"],
                           "employee_email": row["emp_email"], "employee_designation": row["emp_designation"],
                           "manager_code": row["emp_manager"], "manager_name": row["manager_name"],
                           "manager_email": row["manager_email"]})
    return people


AUDIENCE_LOADERS = {"employees_not_clocked_in": employees_not_clocked_in}


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [part.strip() for part in re.split(r"[\n,;]+", value) if part.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or "").strip()]
    raise EmailTemplateError("Recipients must be a list of email addresses or placeholders.")


class EmailTriggerService:
    def __init__(self, email_service: EmailService | None = None):
        self.email_service = email_service or EmailService()

    # ---------- CRUD ----------
    def list(self) -> list[dict[str, Any]]:
        return self._query("SELECT * FROM email_triggers ORDER BY trigger_key")

    def get(self, trigger_key: str) -> dict[str, Any]:
        rows = self._query("SELECT * FROM email_triggers WHERE trigger_key = %s", ((trigger_key or "").strip(),))
        if not rows:
            raise EmailTemplateError(f"Email trigger {trigger_key!r} was not found.")
        return rows[0]

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._save(payload, creating=True)

    def update(self, trigger_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        existing = self.get(trigger_key)
        return self._save({**existing, **payload, "trigger_key": trigger_key}, creating=False)

    def set_active(self, trigger_key: str, active: bool) -> dict[str, Any]:
        trigger = self.get(trigger_key)
        next_run = next_cron_run(trigger["schedule_cron"]) if active and trigger["trigger_type"] == "schedule" else None
        self._execute("UPDATE email_triggers SET active=%s, next_run_at=%s, updated_at=NOW() WHERE trigger_key=%s",
                      (active, next_run, trigger_key))
        return self.get(trigger_key)

    def delete(self, trigger_key: str) -> None:
        self.get(trigger_key)
        self._execute("DELETE FROM email_triggers WHERE trigger_key=%s", (trigger_key,))

    def _save(self, payload: dict[str, Any], *, creating: bool) -> dict[str, Any]:
        pick = lambda camel, snake, default=None: payload[camel] if camel in payload else payload.get(snake, default)
        key = str(pick("triggerKey", "trigger_key") or "").strip()
        name = str(pick("triggerName", "trigger_name") or "").strip()
        template_key = str(pick("templateKey", "template_key") or "").strip()
        trigger_type = str(pick("triggerType", "trigger_type") or "").strip().lower()
        event_name = str(pick("eventName", "event_name") or "").strip() or None
        cron = str(pick("scheduleCron", "schedule_cron") or "").strip() or None
        to = _as_list(pick("toRecipients", "to_recipients"))
        cc = _as_list(pick("ccRecipients", "cc_recipients"))
        bcc = _as_list(pick("bccRecipients", "bcc_recipients"))
        variables = pick("variables", "variables") or {}
        audience = str(pick("audience", "audience") or "").strip() or None
        active = bool(pick("active", "active", True))

        if not key or not name or not template_key:
            raise EmailTemplateError("triggerKey, triggerName, and templateKey are required.")
        if trigger_type not in TRIGGER_TYPES:
            raise EmailTemplateError("triggerType must be one of: manual, event, schedule.")
        if not isinstance(variables, dict):
            raise EmailTemplateError("variables must be a JSON object.")
        if trigger_type == "event" and event_name not in EMAIL_EVENTS:
            raise EmailTemplateError("eventName must be one of: " + ", ".join(sorted(EMAIL_EVENTS)) + ".")
        if trigger_type == "schedule" and not cron:
            raise EmailTemplateError("scheduleCron is required for schedule triggers.")
        if audience and (trigger_type != "schedule" or audience not in AUDIENCES):
            raise EmailTemplateError("audience is only for schedule triggers and must be one of: " + ", ".join(AUDIENCES) + ".")
        if trigger_type != "manual" and not to:
            raise EmailTemplateError("Automatic triggers need at least one To recipient or placeholder.")
        self.email_service.templates.get(template_key, require_active=False)

        next_run = next_cron_run(cron) if trigger_type == "schedule" and active else None
        values = (name, template_key, trigger_type, event_name if trigger_type == "event" else None,
                  cron if trigger_type == "schedule" else None, Json(to), Json(cc), Json(bcc), Json(variables), active, next_run,
                  audience if trigger_type == "schedule" else None)
        try:
            if creating:
                self._execute("""INSERT INTO email_triggers (trigger_name, template_key, trigger_type, event_name, schedule_cron,
                                     to_recipients, cc_recipients, bcc_recipients, variables, active, next_run_at, audience, trigger_key)
                                 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", values + (key,))
            else:
                self._execute("""UPDATE email_triggers SET trigger_name=%s, template_key=%s, trigger_type=%s, event_name=%s,
                                     schedule_cron=%s, to_recipients=%s, cc_recipients=%s, bcc_recipients=%s, variables=%s,
                                     active=%s, next_run_at=%s, audience=%s, updated_at=NOW()
                                 WHERE trigger_key=%s""", values + (key,))
        except Exception as exc:
            if "duplicate key" in str(exc).lower():
                raise EmailTemplateError(f"Email trigger {key!r} already exists.") from exc
            raise
        return self.get(key)

    # ---------- Firing ----------
    def run(self, trigger: dict[str, Any], context: dict[str, Any] | None = None, *, overrides: dict[str, Any] | None = None,
            reference_id: str | None = None) -> dict[str, Any]:
        """Send one trigger now. Used by manual runs, events, and the scheduler."""
        overrides = overrides or {}
        variables = {**(trigger.get("variables") or {}),
                     **{k: _stringify(v) for k, v in (context or {}).items() if v is not None},  # blanks fall back to defaults
                     **(overrides.get("variables") or {})}
        # A recipient list present in overrides is used exactly as given (even empty), so a manual
        # test run never falls back to the trigger's CC/BCC without the admin seeing it.
        def recipients(field: str) -> list[str]:
            entries = _as_list(overrides[field]) if field in overrides else trigger.get(f"{field}_recipients")
            return _resolve_recipients(_expand_designations(entries), variables)
        to, cc, bcc = recipients("to"), recipients("cc"), recipients("bcc")

        if not to:
            configured = ", ".join(_as_list(overrides["to"]) if "to" in overrides else trigger.get("to_recipients") or []) or "nothing"
            message = f"No To recipient resolved for this run (To was: {configured}). Enter an email address in To."
            self._record(trigger["trigger_key"], "skipped", message)
            return {"success": False, "status": "skipped", "message": message}
        try:
            result = self.email_service.send(DynamicEmailRequest(
                template_key=trigger["template_key"], to=to, cc=cc, bcc=bcc, variables=variables,
                source_service=f"trigger:{trigger['trigger_key']}", reference_id=reference_id,
            ))
        except Exception as exc:
            self._record(trigger["trigger_key"], "failed", str(exc))
            raise
        self._record(trigger["trigger_key"], "sent", None)
        return result

    def run_manual(self, trigger: dict[str, Any], overrides: dict[str, Any], *, admin_emp_code: str | None = None,
                   reference_id: str | None = None) -> dict[str, Any]:
        """'Run now': fill placeholders with realistic sample data so a test run renders like a real one.

        Audience triggers use the first matching employee as the sample; other triggers use the
        admin's own employee record. Recipients still come only from the run dialog / overrides.
        """
        now = datetime.now(trigger_timezone())
        sample: dict[str, Any] = {"run_date": now.date(), "run_time": now.strftime("%H:%M")}
        if trigger.get("audience") in AUDIENCE_LOADERS:
            people = AUDIENCE_LOADERS[trigger["audience"]](now.date())
            if people:
                sample.update(people[0])
        if "employee_code" not in sample and admin_emp_code:
            sample.update(employee_contacts(admin_emp_code))
        return self.run(trigger, sample, overrides=overrides, reference_id=reference_id or "manual-test")

    def dispatch_event(self, event_name: str, context: dict[str, Any] | Callable[[], dict[str, Any]],
                       reference_id: str | None = None) -> int:
        triggers = self._query("SELECT * FROM email_triggers WHERE active AND trigger_type='event' AND event_name=%s", (event_name,))
        if not triggers:
            return 0
        if callable(context):
            context = context()
        sent = 0
        for trigger in triggers:
            try:
                if self.run(trigger, context, reference_id=reference_id).get("success"):
                    sent += 1
            except Exception:
                logger.exception("Email trigger %s failed for event %s", trigger["trigger_key"], event_name)
        return sent

    def process_due_schedules(self) -> dict[str, Any]:
        """Claim due schedule triggers (advancing next_run_at first so they never double-send), then send."""
        conn = get_db_connection(); cursor = conn.cursor()
        claimed: list[dict[str, Any]] = []
        try:
            cursor.execute("""SELECT * FROM email_triggers
                              WHERE active AND trigger_type='schedule' AND next_run_at <= NOW()
                              FOR UPDATE SKIP LOCKED""")
            for trigger in cursor.fetchall():
                try:
                    next_run = next_cron_run(trigger["schedule_cron"])
                except EmailTemplateError:
                    next_run = None
                cursor.execute("UPDATE email_triggers SET next_run_at=%s WHERE id=%s", (next_run, trigger["id"]))
                claimed.append(trigger)
            conn.commit()
        except Exception:
            conn.rollback(); raise
        finally:
            cursor.close(); return_connection(conn)

        sent = failed = 0
        for trigger in claimed:
            try:
                ok, bad = self._run_scheduled(trigger)
                sent += ok; failed += bad
            except Exception:
                failed += 1
                logger.exception("Scheduled email trigger %s failed", trigger["trigger_key"])
        return {"success": failed == 0, "claimed": len(claimed), "sent": sent, "failed": failed}

    def _run_scheduled(self, trigger: dict[str, Any]) -> tuple[int, int]:
        now = datetime.now(trigger_timezone())
        base = {"run_date": now.date(), "run_time": now.strftime("%H:%M")}
        audience = trigger.get("audience")
        if not audience:
            return (1, 0) if self.run(trigger, base).get("success") else (0, 0)
        people = AUDIENCE_LOADERS[audience](now.date())
        if not people:
            self._record(trigger["trigger_key"], "skipped", "Audience was empty for this run.")
            return 0, 0
        # Resolve designation recipients once for the whole fan-out.
        expanded = {**trigger, **{k: _expand_designations(trigger.get(k)) for k in ("to_recipients", "cc_recipients", "bcc_recipients")}}
        sent = failed = 0
        for person in people:
            try:
                result = self.run(expanded, {**base, **person}, reference_id=f"{person['employee_code']}:{now.date().isoformat()}")
                sent += 1 if result.get("success") else 0
            except Exception:
                failed += 1
                logger.exception("Email trigger %s failed for %s", trigger["trigger_key"], person.get("employee_code"))
        logger.info("Email trigger %s audience %s: %s sent, %s failed", trigger["trigger_key"], audience, sent, failed)
        return sent, failed

    # ---------- helpers ----------
    def _record(self, trigger_key: str, status: str, error: str | None) -> None:
        try:
            self._execute("UPDATE email_triggers SET last_run_at=NOW(), last_status=%s, last_error=%s WHERE trigger_key=%s",
                          (status, (error or "")[:1000] or None, trigger_key))
        except Exception:
            logger.exception("Could not record email trigger run %s", trigger_key)

    @staticmethod
    def _query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        conn = get_db_connection(); cursor = conn.cursor()
        try:
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            cursor.close(); return_connection(conn)

    @staticmethod
    def _execute(sql: str, params: tuple = ()) -> None:
        conn = get_db_connection(); cursor = conn.cursor()
        try:
            cursor.execute(sql, params)
            conn.commit()
        except Exception:
            conn.rollback(); raise
        finally:
            cursor.close(); return_connection(conn)


def employee_contacts(emp_code: str) -> dict[str, Any]:
    """Employee and direct-manager names/emails, keyed the way email events expose them."""
    rows = EmailTriggerService._query("""
        SELECT e.emp_code, e.emp_full_name, e.emp_email, e.emp_manager,
               m.emp_full_name AS manager_name, m.emp_email AS manager_email
        FROM employees e LEFT JOIN employees m ON e.emp_manager = m.emp_code
        WHERE e.emp_code = %s""", (emp_code,))
    if not rows:
        return {"employee_code": emp_code}
    row = rows[0]
    return {"employee_code": row["emp_code"], "employee_name": row["emp_full_name"], "employee_email": row["emp_email"],
            "manager_code": row["emp_manager"], "manager_name": row["manager_name"], "manager_email": row["manager_email"]}


def emit_email_event(event_name: str, context: dict[str, Any] | Callable[[], dict[str, Any]], reference_id: Any = None) -> None:
    """Fire-and-forget: queue automatic emails for an application event. Never raises.

    ``context`` may be a zero-argument callable; it then runs in the background, and only
    when at least one active trigger listens for the event.
    """
    def _dispatch():
        try:
            EmailTriggerService().dispatch_event(event_name, context, str(reference_id) if reference_id is not None else None)
        except Exception:
            logger.exception("Email event dispatch failed for %s", event_name)
    try:
        _executor.submit(_dispatch)
    except Exception:
        logger.exception("Could not queue email event %s", event_name)
