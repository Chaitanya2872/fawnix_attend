"""Generic, database-backed email templates and Resend/SMTP delivery.

Template syntax is deliberately limited to ``{{variable_name}}``. It is not a
programming language: values cannot invoke methods or evaluate expressions. HTML
values are always escaped, including values supplied by an authenticated caller.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import parseaddr
import html
import logging
import re
import smtplib

import requests
from typing import Any, Iterable

from config import Config
from database.connection import get_db_connection, return_connection

logger = logging.getLogger(__name__)
_PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}")
_UNRESOLVED = re.compile(r"\{\{[^{}]+\}\}")


class EmailTemplateError(ValueError):
    """A client-correctable template, recipient, or rendering error."""


@dataclass
class DynamicEmailRequest:
    template_key: str
    to: list[str]
    cc: list[str] = field(default_factory=list)
    bcc: list[str] = field(default_factory=list)
    variables: dict[str, Any] = field(default_factory=dict)
    source_service: str | None = None
    reference_id: str | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "DynamicEmailRequest":
        if not isinstance(payload, dict):
            raise EmailTemplateError("JSON request body is required.")
        return cls(
            template_key=str(payload.get("templateKey") or payload.get("template_key") or "").strip(),
            to=payload.get("to") or [], cc=payload.get("cc") or [], bcc=payload.get("bcc") or [],
            variables=payload.get("variables") or {},
            source_service=payload.get("sourceService") or payload.get("source_service"),
            reference_id=payload.get("referenceId") or payload.get("reference_id"),
        )


class EmailTemplateRenderer:
    """Renders safe variable substitutions without expression evaluation."""

    @staticmethod
    def required_variables(*templates: str | None) -> set[str]:
        return {match.group(1) for template in templates if template for match in _PLACEHOLDER.finditer(template)}

    def render(self, template: str | None, variables: dict[str, Any], *, html_output: bool) -> str | None:
        if template is None:
            return None
        if "{{{" in template or "}}}" in template:
            raise EmailTemplateError("Template contains an unsupported placeholder syntax.")
        missing = sorted(name for name in self.required_variables(template) if name not in variables or variables[name] is None)
        if missing:
            raise EmailTemplateError("Missing template variable(s): " + ", ".join(missing) + ".")

        def replace(match: re.Match[str]) -> str:
            value = str(variables[match.group(1)])
            return value if not html_output else html.escape(value, quote=True)

        rendered = _PLACEHOLDER.sub(replace, template)
        if _UNRESOLVED.search(rendered):
            raise EmailTemplateError("Template contains an unresolved placeholder.")
        return rendered


class EmailValidationService:
    @staticmethod
    def recipients(to: Iterable[Any], cc: Iterable[Any], bcc: Iterable[Any]) -> tuple[list[str], list[str], list[str]]:
        seen: set[str] = set()

        def normalize(values: Iterable[Any], label: str) -> list[str]:
            result: list[str] = []
            for value in values:
                address = str(value or "").strip()
                if not address:
                    continue
                parsed = parseaddr(address)[1]
                if parsed != address or "@" not in address or address.startswith("@") or address.endswith("@"):
                    raise EmailTemplateError(f"Invalid {label} email address: {address!r}.")
                key = address.casefold()
                if key not in seen:
                    seen.add(key)
                    result.append(address)
            return result

        normalized_to = normalize(to, "To")
        if not normalized_to:
            raise EmailTemplateError("At least one To recipient is required.")
        # Earlier visible recipient lists take precedence, then BCC. This prevents
        # duplicate delivery and never promotes a BCC recipient into a visible header.
        return normalized_to, normalize(cc, "CC"), normalize(bcc, "BCC")


class EmailTemplateService:
    def get(self, template_key: str, *, require_active: bool = True) -> dict[str, Any]:
        key = (template_key or "").strip()
        if not key:
            raise EmailTemplateError("templateKey is required.")
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM email_templates WHERE template_key = %s", (key,))
            template = cursor.fetchone()
        finally:
            cursor.close(); return_connection(conn)
        if not template:
            raise EmailTemplateError(f"Email template {key!r} was not found.")
        if require_active and not template["active"]:
            raise EmailTemplateError(f"Email template {key!r} is inactive.")
        return template

    def list(self) -> list[dict[str, Any]]:
        conn = get_db_connection(); cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM email_templates ORDER BY template_key")
            return cursor.fetchall()
        finally:
            cursor.close(); return_connection(conn)

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._save(payload, creating=True)

    def update(self, template_key: str, payload: dict[str, Any]) -> dict[str, Any]:
        existing = self.get(template_key, require_active=False)
        merged = {**existing, **payload, "template_key": template_key}
        return self._save(merged, creating=False)

    def set_active(self, template_key: str, active: bool) -> dict[str, Any]:
        self.get(template_key, require_active=False)
        conn = get_db_connection(); cursor = conn.cursor()
        try:
            cursor.execute("UPDATE email_templates SET active=%s, updated_at=NOW() WHERE template_key=%s", (active, template_key))
            conn.commit()
        except Exception:
            conn.rollback(); raise
        finally:
            cursor.close(); return_connection(conn)
        return self.get(template_key, require_active=False)

    def _save(self, payload: dict[str, Any], *, creating: bool) -> dict[str, Any]:
        key = str(payload.get("templateKey") or payload.get("template_key") or "").strip()
        name = str(payload.get("templateName") or payload.get("template_name") or "").strip()
        subject = str(payload.get("subjectTemplate") or payload.get("subject_template") or "").strip()
        html_body = payload.get("htmlBody") if "htmlBody" in payload else payload.get("html_body")
        text_body = payload.get("textBody") if "textBody" in payload else payload.get("text_body")
        if not key or not name or not subject or (not html_body and not text_body):
            raise EmailTemplateError("templateKey, templateName, subjectTemplate, and htmlBody or textBody are required.")
        active = bool(payload.get("active", True))
        conn = get_db_connection(); cursor = conn.cursor()
        try:
            if creating:
                cursor.execute("""INSERT INTO email_templates (template_key, template_name, subject_template, html_body, text_body, active)
                                  VALUES (%s,%s,%s,%s,%s,%s)""", (key, name, subject, html_body, text_body, active))
            else:
                cursor.execute("""UPDATE email_templates SET template_name=%s, subject_template=%s, html_body=%s, text_body=%s, active=%s, updated_at=NOW()
                                  WHERE template_key=%s""", (name, subject, html_body, text_body, active, key))
            conn.commit()
        except Exception as exc:
            conn.rollback()
            if "duplicate key" in str(exc).lower():
                raise EmailTemplateError(f"Email template {key!r} already exists.") from exc
            raise
        finally:
            cursor.close(); return_connection(conn)
        return self.get(key, require_active=False)


class EmailService:
    def __init__(self, templates: EmailTemplateService | None = None, renderer: EmailTemplateRenderer | None = None):
        self.templates = templates or EmailTemplateService()
        self.renderer = renderer or EmailTemplateRenderer()
        self.validation = EmailValidationService()

    def send(self, request: DynamicEmailRequest) -> dict[str, Any]:
        to, cc, bcc = self.validation.recipients(request.to, request.cc, request.bcc)
        try:
            template = self.templates.get(request.template_key)
            subject = self.renderer.render(template["subject_template"], request.variables, html_output=False)
            html_body = self.renderer.render(template["html_body"], request.variables, html_output=True)
            text_body = self.renderer.render(template["text_body"], request.variables, html_output=False)
            if not text_body and html_body:
                text_body = re.sub(r"<[^>]+>", "", html_body)
            message_id = self._deliver(subject, html_body, text_body, to, cc, bcc)
            self._audit(request, len(to), len(cc), len(bcc), "sent", message_id=message_id)
            return {"success": True, "status": "sent", "templateKey": request.template_key, "provider": Config.EMAIL_PROVIDER,
                    "messageId": message_id, "recipientCount": len(to), "ccCount": len(cc),
                    "sentAt": datetime.now(timezone.utc).isoformat()}
        except Exception as exc:
            self._audit(request, len(to), len(cc), len(bcc), "failed", str(exc))
            if isinstance(exc, EmailTemplateError):
                raise
            logger.exception("Generic email delivery failed template_key=%s recipients=%s cc=%s bcc_count=%s", request.template_key, len(to), len(cc), len(bcc))
            raise RuntimeError("Email provider delivery failed.") from exc

    def _deliver(self, subject: str, html_body: str | None, text_body: str | None, to: list[str], cc: list[str], bcc: list[str]) -> str | None:
        """Send through the configured provider and return its message id, if any."""
        if Config.EMAIL_PROVIDER == "resend":
            return self._send_resend(subject, html_body, text_body, to, cc, bcc)
        if Config.EMAIL_PROVIDER == "smtp":
            self._send_smtp(subject, html_body, text_body, to, cc, bcc)
            return None
        raise RuntimeError(f"Unsupported EMAIL_PROVIDER {Config.EMAIL_PROVIDER!r}; use 'resend' or 'smtp'.")

    def _send_resend(self, subject: str, html_body: str | None, text_body: str | None, to: list[str], cc: list[str], bcc: list[str]) -> str | None:
        if not Config.RESEND_API_KEY or not Config.RESEND_FROM:
            raise RuntimeError("RESEND_API_KEY and RESEND_FROM must be configured.")
        payload: dict[str, Any] = {"from": Config.RESEND_FROM, "to": to, "subject": subject}
        if cc: payload["cc"] = cc
        if bcc: payload["bcc"] = bcc
        if html_body: payload["html"] = html_body
        if text_body: payload["text"] = text_body
        if Config.RESEND_REPLY_TO: payload["reply_to"] = Config.RESEND_REPLY_TO
        response = requests.post(Config.RESEND_API_URL, json=payload, timeout=30,
                                 headers={"Authorization": f"Bearer {Config.RESEND_API_KEY}"})
        if response.status_code >= 400:
            try:
                detail = response.json().get("message") or response.text
            except ValueError:
                detail = response.text
            raise RuntimeError(f"Resend rejected the email ({response.status_code}): {detail}")
        try:
            return response.json().get("id")
        except ValueError:
            return None

    def _send_smtp(self, subject: str, html_body: str | None, text_body: str | None, to: list[str], cc: list[str], bcc: list[str]) -> None:
        if not Config.SMTP_HOST or not Config.SMTP_FROM:
            raise RuntimeError("SMTP_HOST and SMTP_FROM must be configured.")
        message = EmailMessage()
        message["From"] = Config.SMTP_FROM; message["To"] = ", ".join(to); message["Subject"] = subject
        if cc: message["Cc"] = ", ".join(cc)
        message.set_content(text_body or "")
        if html_body: message.add_alternative(html_body, subtype="html")
        recipients = to + cc + bcc
        smtp_class = smtplib.SMTP_SSL if Config.SMTP_USE_SSL else smtplib.SMTP
        with smtp_class(Config.SMTP_HOST, Config.SMTP_PORT, timeout=30) as client:
            if Config.SMTP_USE_TLS and not Config.SMTP_USE_SSL: client.starttls()
            if Config.SMTP_USERNAME: client.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
            client.send_message(message, from_addr=Config.SMTP_FROM, to_addrs=recipients)

    def _audit(self, request: DynamicEmailRequest, recipients: int, cc: int, bcc: int, status: str, reason: str | None = None, message_id: str | None = None) -> None:
        try:
            conn = get_db_connection(); cursor = conn.cursor()
            try:
                cursor.execute("""INSERT INTO email_delivery_audit (template_key, source_service, reference_id, recipient_count, cc_count, bcc_count, status, sent_at, failure_reason, provider, provider_message_id)
                                  VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (request.template_key, request.source_service, request.reference_id, recipients, cc, bcc, status, datetime.now(timezone.utc) if status == "sent" else None, (reason or "")[:1000] or None, Config.EMAIL_PROVIDER, message_id))
                conn.commit()
            finally:
                cursor.close(); return_connection(conn)
        except Exception:
            logger.exception("Could not write email audit record template_key=%s", request.template_key)
