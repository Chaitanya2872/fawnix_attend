"""
Time utilities for consistent local time handling.
"""

from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import os


def get_app_timezone():
    timezone_name = os.environ.get("AUTO_CLOCKOUT_TIMEZONE", "Asia/Kolkata")
    try:
        return timezone_name, ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        try:
            return "Asia/Kolkata", ZoneInfo("Asia/Kolkata")
        except ZoneInfoNotFoundError:
            return "UTC", dt_timezone.utc


def now_local_naive() -> datetime:
    """
    Return a naive datetime in the configured app timezone.
    Stored in DB TIMESTAMP (without tz) to preserve local time.
    """
    _name, tz = get_app_timezone()
    return datetime.now(tz).replace(tzinfo=None)
