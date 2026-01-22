"""
Attendance Scheduler
Runs auto clock-out job daily at 6:30 PM
"""

from apscheduler.schedulers.background import BackgroundScheduler
from services.auto_clockout_service import auto_clockout_all_active_sessions
import logging

logger = logging.getLogger(__name__)

def start_attendance_scheduler():
    """Start the attendance scheduler"""
    scheduler = BackgroundScheduler()
    
    # Add job to run daily at 6:30 PM
    scheduler.add_job(
        auto_clockout_all_active_sessions,
        'cron',
        hour=18,
        minute=30,
        id='auto_clockout_job'
    )
    
    # Start the scheduler
    scheduler.start()
    
    logger.info("✅ Attendance scheduler started - Auto clock-out job scheduled daily at 6:30 PM")
    
    return scheduler