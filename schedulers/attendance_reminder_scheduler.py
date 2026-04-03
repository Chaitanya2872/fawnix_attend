"""
Attendance Reminder Scheduler
Registers the daily attendance reminder job.
"""

import logging

from apscheduler.triggers.cron import CronTrigger

from config import Config
from services.notification_service import send_attendance_reminder_notifications

logger = logging.getLogger(__name__)


def attendance_reminder_job():
    """Scheduled wrapper for attendance reminder notifications."""
    result = send_attendance_reminder_notifications()

    if result.get("success"):
        logger.info("Attendance reminder job completed: %s", result.get("message"))
    else:
        logger.warning("Attendance reminder job completed with issues: %s", result.get("message"))

    return result


def register_attendance_reminder_job(scheduler, scheduler_timezone, misfire_grace_time: int):
    """Register the daily attendance reminder job on the shared scheduler."""
    raw_time = (Config.ATTENDANCE_REMINDER_TIME or "10:15").strip()

    try:
        reminder_hour, reminder_minute = [int(part) for part in raw_time.split(":", 1)]
    except (TypeError, ValueError):
        reminder_hour, reminder_minute = 10, 15
        logger.warning(
            "Invalid ATTENDANCE_REMINDER_TIME '%s'. Falling back to 10:15.",
            raw_time,
        )

    scheduler.add_job(
        attendance_reminder_job,
        CronTrigger(hour=reminder_hour, minute=reminder_minute, timezone=scheduler_timezone),
        id="attendance_reminder_job",
        replace_existing=True,
        misfire_grace_time=misfire_grace_time,
    )
    logger.info(
        "Attendance reminder job scheduled for %02d:%02d (%s)",
        reminder_hour,
        reminder_minute,
        scheduler_timezone,
    )
