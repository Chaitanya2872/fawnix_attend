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
    Send WhatsApp leave notification
    """

    try:
        formatted_phone = _format_phone(phone_number)
        normalized_message = (message or "").strip().rstrip(".")
        normalized_subject_name = (subject_employee_name or "").strip()
        day_count = _format_days(number_of_days)
        reason_text = (reason or "").strip() or "Not specified"

        if notification_type == "submission":
            template_name = getattr(Config, "WHATSAPP_LEAVE_SUBMISSION_TEMPLATE", "fawnix_notification")
            requester_name = normalized_subject_name or normalized_message
            if template_name == "fawnix_notification":
                status_text = f"submitted by {requester_name}"
                body_values = [employee_name, from_date, to_date, status_text]
            else:
                body_values = [employee_name, requester_name, from_date, to_date, day_count, reason_text]
            full_message = (
                f"Hi {employee_name},\n"
                f"{requester_name} has requested leave from {from_date} to {to_date} ({day_count} days) "
                f"for the following reason:\n"
                f"{reason_text}\n"
                f"Fawnix"
            )
        elif notification_type == "manager_action":
            template_name = getattr(Config, "WHATSAPP_LEAVE_MANAGER_ACTION_TEMPLATE", "fawnix_notification")
            requester_name = normalized_subject_name
            action_taken = normalized_message
            if template_name == "fawnix_notification":
                status_text = f"{action_taken} by you for {requester_name}"
                body_values = [employee_name, from_date, to_date, status_text]
            else:
                body_values = [employee_name, action_taken, requester_name, from_date, to_date, day_count]
            full_message = (
                f"Hi {employee_name},\n"
                f"You have {action_taken} the leave request of {requester_name} for the period "
                f"{from_date} to {to_date} ({day_count} days).\n"
                f"Fawnix"
            )
        else:
            template_name = getattr(Config, "WHATSAPP_LEAVE_STATUS_TEMPLATE", "fawnix_notification")
            status_text = normalized_message
            body_values = [employee_name, from_date, to_date, status_text]
            full_message = (
                f"Hello {employee_name},\n\n"
                f"Your leave request from {from_date} to {to_date} has been {status_text}.\n\n"
                "- Fawnix"
            )

        if not Config.WHATSAPP_TOKEN or not Config.PHONE_NUMBER_ID:
            logger.info(f"""
            DEV MODE WHATSAPP
            TYPE  : {notification_type}
            TITLE : {title}
            NAME  : {employee_name}
            MSG   : {message}
            FROM  : {from_date}
            TO    : {to_date}
            """)
            return True

        url = f"https://graph.facebook.com/v19.0/{Config.PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {Config.WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        body_parameters = [{"type": "text", "text": str(value)} for value in body_values]

        # Use template first for production reliability (works outside 24h session window).
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
                            {"type": "text", "text": title}
                        ]
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
            logger.info("WhatsApp leave template message sent")
            return True

        # Retry without header in case template body exists but header is not configured.
        template_payload["template"]["components"] = [template_payload["template"]["components"][1]]
        retry_response = requests.post(url, headers=headers, json=template_payload, timeout=15)
        if retry_response.status_code == 200:
            logger.info("WhatsApp leave template message sent (without header)")
            return True

        logger.warning(
            "WhatsApp leave template send failed (status=%s): %s. Falling back to text message.",
            retry_response.status_code,
            retry_response.text
        )

        text_payload = {
            "messaging_product": "whatsapp",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "body": full_message
            }
        }

        text_response = requests.post(url, headers=headers, json=text_payload, timeout=15)
        if text_response.status_code == 200:
            logger.info("WhatsApp leave text message sent (fallback)")
            return True

        logger.error(
            "WhatsApp leave send failed. template_status=%s text_status=%s template_response=%s text_response=%s",
            retry_response.status_code,
            text_response.status_code,
            retry_response.text,
            text_response.text
        )
        return False

    except Exception:
        logger.exception("WhatsApp send failed")
        return False
