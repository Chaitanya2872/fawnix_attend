import requests
from config import Config
import logging

logger = logging.getLogger(__name__)

def send_otp(phone_number: str, otp: str, emp_name: str) -> bool:
    """Send OTP via WhatsApp Business API"""
    try:
        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID or \
           Config.WHATSAPP_TOKEN == "" or Config.PHONE_NUMBER_ID == "":
            logger.info(f"DEV MODE - OTP for {emp_name} ({phone_number}): {otp}")
            return True

        logger.info(f"Sending OTP via WhatsApp to {phone_number}")

        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        formatted_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "").strip()
        if not formatted_phone.startswith("91") and len(formatted_phone) == 10:
            formatted_phone = "91" + formatted_phone

        components = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": otp}]
            }
        ]

        has_button = getattr(Config, 'WHATSAPP_TEMPLATE_HAS_BUTTON', True)
        if has_button:
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [{"type": "text", "text": otp}]
            })

        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": Config.WHATSAPP_TEMPLATE_NAME,
                "language": {"code": "en_US"},
                "components": components
            }
        }

        response = requests.post(url, headers=headers, json=payload, timeout=15)

        if response.status_code == 200:
            logger.info(f"WhatsApp OTP sent successfully to {phone_number}")
            return True
        else:
            logger.error(f"WhatsApp API error - Status: {response.status_code}, Response: {response.text}")

            if response.status_code == 400 and has_button and "button" in response.text.lower():
                logger.info("Retrying without button component...")
                payload["template"]["components"] = [components[0]]
                retry_response = requests.post(url, headers=headers, json=payload, timeout=15)
                if retry_response.status_code == 200:
                    logger.info("WhatsApp OTP sent successfully (without button)")
                    return True
                logger.error(f"Retry failed - Status: {retry_response.status_code}, Response: {retry_response.text}")

            logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
            return False

    except requests.exceptions.Timeout:
        logger.error("WhatsApp API timeout after 15 seconds")
        logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp error: {e}")
        logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
        return False


def send_notification(phone_number: str, message: str, template_name: str = None) -> bool:
    """Send a plain text notification via WhatsApp."""
    try:
        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID:
            logger.info(f"DEV MODE - Notification to {phone_number}: {message}")
            return True

        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        formatted_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "").strip()
        if not formatted_phone.startswith("91") and len(formatted_phone) == 10:
            formatted_phone = "91" + formatted_phone

        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {"body": message}
        }

        response = requests.post(url, headers=headers, json=payload, timeout=15)

        if response.status_code == 200:
            logger.info(f"WhatsApp notification sent to {phone_number}")
            return True
        else:
            logger.error(f"WhatsApp notification failed - Status: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"WhatsApp notification error: {e}")
        return False


def _format_phone(phone: str) -> str:
    phone = phone.replace("+", "").replace("-", "").replace(" ", "").strip()
    if len(phone) == 10:
        phone = "91" + phone
    return phone


def _format_days(number_of_days) -> str:
    """Return a clean day count string (e.g., 2, 1.5)."""
    if number_of_days is None:
        return ""
    try:
        value = float(number_of_days)
        return str(int(value)) if value.is_integer() else f"{value}".rstrip("0").rstrip(".")
    except (TypeError, ValueError):
        return str(number_of_days).strip()


def send_leave_notification(
    phone_number: str,
    title: str,
    employee_name: str,
    message: str,
    from_date: str,
    to_date: str,
    notification_type: str = "decision",
    number_of_days=None,
    reason: str = "",
    subject_employee_name: str = ""
) -> bool:
    """
    Send WhatsApp leave notification using the approved template:

        Hi {{1}},
        {{2}} from {{3}} to {{4}} ({{5}} days).
        Reason: {{6}}
        This is an automated message. Please Do not Reply here

    Variable mapping per notification type:

    submission (Manager notified of employee leave request):
        {{1}} = Manager name
        {{2}} = "{Employee} has requested leave"
        {{3}} = from_date
        {{4}} = to_date
        {{5}} = number of days
        {{6}} = reason

    decision (Employee notified of leave outcome):
        {{1}} = Employee name
        {{2}} = "Your leave request has been {approved/rejected}"
        {{3}} = from_date
        {{4}} = to_date
        {{5}} = number of days
        {{6}} = "-"

    manager_action (Manager confirmation of their own action):
        {{1}} = Manager name
        {{2}} = "You have {approved/rejected} {Employee}'s leave"
        {{3}} = from_date
        {{4}} = to_date
        {{5}} = number of days
        {{6}} = "-"
    """
    try:
        formatted_phone = _format_phone(phone_number)
        day_count = _format_days(number_of_days)
        reason_text = (reason or "").strip() or "-"
        action = (message or "").strip()
        subject_name = (subject_employee_name or "").strip()
        template_name = getattr(Config, "WHATSAPP_LEAVE_TEMPLATE", "fawnix_notification")

        # ── Build the 6 variable values ───────────────────────────────────
        if notification_type == "submission":
            v1 = employee_name                               # Manager name
            v2 = f"{subject_name} has requested leave"
            v3 = from_date
            v4 = to_date
            v5 = day_count
            v6 = reason_text                                 # Actual leave reason

        elif notification_type == "manager_action":
            v1 = employee_name                               # Manager name
            v2 = f"You have {action} {subject_name}'s leave"
            v3 = from_date
            v4 = to_date
            v5 = day_count
            v6 = "-"

        else:  # "decision"
            v1 = employee_name                               # Employee name
            v2 = f"Your leave request has been {action}"
            v3 = from_date
            v4 = to_date
            v5 = day_count
            v6 = "-"

        # Human-readable version (used as plain-text fallback)
        full_message = (
            f"Hi {v1},\n"
            f"{v2} from {v3} to {v4} ({v5} days).\n"
            f"Reason: {v6}\n"
            f"This is an automated message. Please Do not Reply here"
        )

        # ── DEV MODE ──────────────────────────────────────────────────────
        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID:
            logger.info(
                "DEV MODE WHATSAPP | type=%s | to=%s (%s)\n%s",
                notification_type, employee_name, phone_number, full_message
            )
            return True

        # ── PRODUCTION ────────────────────────────────────────────────────
        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        template_payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "en_US"},
                "components": [
                    {
                        "type": "header",
                        "parameters": [
                            {"type": "text", "text": str(title)}
                        ]
                    },
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(v1)},
                            {"type": "text", "text": str(v2)},
                            {"type": "text", "text": str(v3)},
                            {"type": "text", "text": str(v4)},
                            {"type": "text", "text": str(v5)},
                            {"type": "text", "text": str(v6)},
                        ]
                    }
                ]
            }
        }

        response = requests.post(url, headers=headers, json=template_payload, timeout=15)
        if response.status_code == 200:
            logger.info(
                "WhatsApp leave template sent | type=%s | to=%s",
                notification_type, formatted_phone
            )
            return True

        logger.warning(
            "WhatsApp template failed (status=%s): %s — falling back to text.",
            response.status_code, response.text
        )

        # Fallback: plain text message
        text_payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {"body": full_message}
        }
        text_response = requests.post(url, headers=headers, json=text_payload, timeout=15)
        if text_response.status_code == 200:
            logger.info(
                "WhatsApp leave text sent (fallback) | type=%s | to=%s",
                notification_type, formatted_phone
            )
            return True

        logger.error(
            "All WhatsApp send attempts failed | template_status=%s text_status=%s "
            "template_response=%s text_response=%s",
            response.status_code, text_response.status_code,
            response.text, text_response.text
        )
        return False

    except Exception:
        logger.exception("WhatsApp send_leave_notification failed")
        return False