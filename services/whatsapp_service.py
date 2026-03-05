import requests
from config import Config
import logging

logger = logging.getLogger(__name__)


def send_otp(phone_number: str, otp: str, emp_name: str) -> bool:
    """Send OTP via WhatsApp Business API"""
    try:
        # Check if WhatsApp is configured
        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID or \
           Config.WHATSAPP_TOKEN == "" or Config.PHONE_NUMBER_ID == "":
            logger.info(f"DEV MODE - OTP for {emp_name} ({phone_number}): {otp}")
            return True
        
        # Production mode - send via WhatsApp
        logger.info(f"Sending OTP via WhatsApp to {phone_number}")
        
        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Format phone number (remove spaces, dashes, etc.)
        formatted_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "").strip()
        
        # Ensure phone number is in correct format (country code + number)
        if not formatted_phone.startswith("91") and len(formatted_phone) == 10:
            formatted_phone = "91" + formatted_phone  # Add India country code if missing
        
        # Build template components
        components = [
            {
                "type": "body",
                "parameters": [
                    {
                        "type": "text",
                        "text": otp
                    }
                ]
            }
        ]
        
        # Check if template has button (based on config or try with button first)
        has_button = getattr(Config, 'WHATSAPP_TEMPLATE_HAS_BUTTON', True)
        
        if has_button:
            # Add button component for templates with URL buttons
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [
                    {
                        "type": "text",
                        "text": otp
                    }
                ]
            })
        
        # Template payload
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
        
        logger.info(f"WhatsApp API URL: {url}")
        logger.info(f"Sending to: {formatted_phone}")
        logger.info(f"Template: {Config.WHATSAPP_TEMPLATE_NAME}")
        
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            logger.info(f"WhatsApp OTP sent successfully to {phone_number}")
            return True
        else:
            logger.error(f"WhatsApp API error - Status: {response.status_code}")
            logger.error(f"Response: {response.text}")
            
            # If button error and we haven't tried without button yet, retry without button
            if response.status_code == 400 and has_button and "button" in response.text.lower():
                logger.info("Retrying without button component...")
                
                # Remove button component
                payload["template"]["components"] = [components[0]]
                
                retry_response = requests.post(url, headers=headers, json=payload, timeout=15)
                
                if retry_response.status_code == 200:
                    logger.info(f"WhatsApp OTP sent successfully (without button)")
                    return True
                else:
                    logger.error(f"Retry failed - Status: {retry_response.status_code}")
                    logger.error(f"Response: {retry_response.text}")
            
            # Fallback to dev mode on error
            logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
            return False
            
    except requests.exceptions.Timeout:
        logger.error(f"WhatsApp API timeout after 15 seconds")
        logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp error: {e}")
        logger.info(f"FALLBACK - OTP for {emp_name}: {otp}")
        return False


def send_notification(phone_number: str, message: str, template_name: str = None) -> bool:
    """
    Send a notification message via WhatsApp

    Args:
        phone_number: Recipient phone number
        message: Message to send
        template_name: Optional template name (uses default if not provided)

    Returns:
        True if sent successfully, False otherwise
    """
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
        
        # For simple text messages (if you have text message approval)
        payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "body": message
            }
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
    Send WhatsApp leave notification.

    notification_type values:
      - "submission"     : Employee applied leave → notify manager
      - "manager_action" : Manager approved/rejected → confirm to manager
      - "decision"       : Manager approved/rejected → notify employee
    """

    try:
        formatted_phone = _format_phone(phone_number)
        day_count = _format_days(number_of_days)
        reason_text = (reason or "").strip() or "Not specified"
        action_taken = (message or "").strip()
        subject_name = (subject_employee_name or "").strip()

        # ------------------------------------------------------------------
        # Build human-readable full_message (used as text fallback) and
        # body_values (used in the fawnix_notification template whose
        # structure is: "Hello {1}\nYour Request from {2} to {3} has been {4}")
        # ------------------------------------------------------------------

        if notification_type == "submission":
            # Recipient  : Manager
            # subject_name = employee who applied
            template_name = getattr(Config, "WHATSAPP_LEAVE_SUBMISSION_TEMPLATE", "fawnix_notification")

            # status_text fills slot {4} of fawnix_notification
            status_text = (
                f"requested by {subject_name} ({day_count} day(s)). "
                f"Reason: {reason_text}"
            )
            body_values = [employee_name, from_date, to_date, status_text]

            full_message = (
                f"Hi {employee_name},\n"
                f"{subject_name} has requested leave from {from_date} to {to_date} "
                f"({day_count} day(s)) for the following reason:\n"
                f"{reason_text}\n\n"
                f"Fawnix"
            )

        elif notification_type == "manager_action":
            # Recipient  : Manager (confirmation of their own action)
            # subject_name = employee whose leave was actioned
            template_name = getattr(Config, "WHATSAPP_LEAVE_MANAGER_ACTION_TEMPLATE", "fawnix_notification")

            status_text = (
                f"{action_taken} for {subject_name} ({day_count} day(s))"
            )
            body_values = [employee_name, from_date, to_date, status_text]

            full_message = (
                f"Hi {employee_name},\n"
                f"You have {action_taken} the leave request of {subject_name} "
                f"for the period {from_date} to {to_date} ({day_count} day(s)).\n\n"
                f"Fawnix"
            )

        else:  # "decision" — notify the employee of the outcome
            # Recipient  : Employee
            template_name = getattr(Config, "WHATSAPP_LEAVE_STATUS_TEMPLATE", "fawnix_notification")

            status_text = action_taken
            body_values = [employee_name, from_date, to_date, status_text]

            full_message = (
                f"Hi {employee_name},\n"
                f"Your leave request from {from_date} to {to_date} has been {action_taken}.\n\n"
                f"Fawnix"
            )

        # ------------------------------------------------------------------
        # DEV MODE — just log and return
        # ------------------------------------------------------------------
        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID:
            logger.info(
                "DEV MODE WHATSAPP | type=%s | title=%s | to=%s\n%s",
                notification_type, title, employee_name, full_message
            )
            return True

        # ------------------------------------------------------------------
        # PRODUCTION — try WhatsApp template first, fall back to text
        # ------------------------------------------------------------------
        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        body_parameters = [{"type": "text", "text": str(v)} for v in body_values]

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
                        "parameters": [{"type": "text", "text": title}]
                    },
                    {
                        "type": "body",
                        "parameters": body_parameters
                    }
                ]
            }
        }

        response = requests.post(url, headers=headers, json=template_payload, timeout=15)
        if response.status_code == 200:
            logger.info("WhatsApp leave template sent | type=%s | to=%s", notification_type, formatted_phone)
            return True

        # Retry without header component
        template_payload["template"]["components"] = [
            {"type": "body", "parameters": body_parameters}
        ]
        retry_response = requests.post(url, headers=headers, json=template_payload, timeout=15)
        if retry_response.status_code == 200:
            logger.info("WhatsApp leave template sent (no header) | type=%s | to=%s", notification_type, formatted_phone)
            return True

        logger.warning(
            "WhatsApp template failed (status=%s): %s — falling back to text.",
            retry_response.status_code, retry_response.text
        )

        # Final fallback: plain text message
        text_payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {"body": full_message}
        }
        text_response = requests.post(url, headers=headers, json=text_payload, timeout=15)
        if text_response.status_code == 200:
            logger.info("WhatsApp leave text sent (fallback) | type=%s | to=%s", notification_type, formatted_phone)
            return True

        logger.error(
            "All WhatsApp send attempts failed | template_status=%s text_status=%s "
            "template_response=%s text_response=%s",
            retry_response.status_code, text_response.status_code,
            retry_response.text, text_response.text
        )
        return False

    except Exception:
        logger.exception("WhatsApp send_leave_notification failed")
        return False