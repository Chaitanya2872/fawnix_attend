"""
Attendance Reminder Scheduler
Registers daily reminder jobs and the scheduled notification processor.
"""

import logging

from apscheduler.triggers.cron import CronTrigger

from config import Config
from services.notification_service import (
    process_due_scheduled_notifications,
    send_attendance_reminder_notifications,
    send_lunch_reminder_notifications,
)

logger = logging.getLogger(__name__)


def attendance_reminder_job():
    """Scheduled wrapper for attendance reminder notifications."""
    result = send_attendance_reminder_notifications()

    if result.get("success"):
        logger.info("Attendance reminder job completed: %s", result.get("message"))
    else:
        logger.warning("Attendance reminder job completed with issues: %s", result.get("message"))

    return result


def lunch_reminder_job():
    """Scheduled wrapper for lunch reminder notifications."""
    result = send_lunch_reminder_notifications()

    if result.get("success"):
        logger.info("Lunch reminder job completed: %s", result.get("message"))
    else:
        logger.warning("Lunch reminder job completed with issues: %s", result.get("message"))

    return result


def scheduled_notification_processor_job():
    """Scheduled wrapper that processes due custom scheduled notifications."""
    result = process_due_scheduled_notifications()

    if result.get("success"):
        logger.info("Scheduled notification processor completed: %s", result.get("message"))
    else:
        logger.warning("Scheduled notification processor completed with issues: %s", result.get("message"))

    return result


def register_attendance_reminder_job(scheduler, scheduler_timezone, misfire_grace_time: int):
    """Register reminder jobs and the custom scheduled notification processor."""
    raw_time = (Config.ATTENDANCE_REMINDER_TIME or "09:55").strip()

    try:
        reminder_hour, reminder_minute = [int(part) for part in raw_time.split(":", 1)]
    except (TypeError, ValueError):
        reminder_hour, reminder_minute = 9, 55
        logger.warning(
            "Invalid ATTENDANCE_REMINDER_TIME '%s'. Falling back to 09:55.",
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

    lunch_raw_time = (Config.LUNCH_REMINDER_TIME or "13:25").strip()

    try:
        lunch_hour, lunch_minute = [int(part) for part in lunch_raw_time.split(":", 1)]
    except (TypeError, ValueError):
        lunch_hour, lunch_minute = 13, 25
        logger.warning(
            "Invalid LUNCH_REMINDER_TIME '%s'. Falling back to 13:25.",
            lunch_raw_time,
        )

    scheduler.add_job(
        lunch_reminder_job,
        CronTrigger(hour=lunch_hour, minute=lunch_minute, timezone=scheduler_timezone),
        id="lunch_reminder_job",
        replace_existing=True,
        misfire_grace_time=misfire_grace_time,
    )
    logger.info(
        "Lunch reminder job scheduled for %02d:%02d (%s)",
        lunch_hour,
        lunch_minute,
        scheduler_timezone,
    )

    scheduler.add_job(
        scheduled_notification_processor_job,
        CronTrigger(minute="*", timezone=scheduler_timezone),
        id="scheduled_notification_processor_job",
        replace_existing=True,
        misfire_grace_time=misfire_grace_time,
    )
    logger.info(
        "Scheduled notification processor job scheduled every minute (%s)",
        scheduler_timezone,
    )
