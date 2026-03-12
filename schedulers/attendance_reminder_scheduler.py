"""
Attendance Reminder Scheduler
Registers the daily 10:10 AM attendance reminder job.
"""

import logging

from apscheduler.triggers.cron import CronTrigger

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
    """Register the daily 10:10 AM attendance reminder job on the shared scheduler."""
    scheduler.add_job(
        attendance_reminder_job,
        CronTrigger(hour=10, minute=10, timezone=scheduler_timezone),
        id="attendance_reminder_job",
        replace_existing=True,
        misfire_grace_time=misfire_grace_time,
    )
    logger.info("Attendance reminder job scheduled for 10:10 (%s)", scheduler_timezone)
