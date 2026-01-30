"""
Attendance Scheduler
Runs auto clock-out job daily at 6:30 PM
Runs continuous GPS tracking every 3 minutes for active activities
"""

from apscheduler.schedulers.background import BackgroundScheduler
from services.auto_clockout_service import auto_clockout_all_active_sessions
from services.locationtracking_service import auto_track_active_activities
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
    
    # 🚀 NEW: Add job for continuous GPS tracking every 3 minutes
    scheduler.add_job(
        auto_track_active_activities,
        'interval',
        minutes=3,
        id='gps_tracking_job',
        misfire_grace_time=60
    )
    
    # Start the scheduler
    scheduler.start()
    
    logger.info("✅ Attendance scheduler started")
    logger.info("   - Auto clock-out job scheduled daily at 6:30 PM")
    logger.info("   - GPS tracking job scheduled every 3 minutes for active activities")
    
    return scheduler