"""
Attendance Scheduler
Runs auto clock-out job:
  - 6:30 PM (Mon-Fri) 
  - 1:00 PM (1st, 3rd, 5th Saturday - half days)
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
    
    # Add job to run daily at 6:30 PM (handles weekdays automatically via get_auto_clockout_time)
    scheduler.add_job(
        auto_clockout_all_active_sessions,
        'cron',
        hour=18,
        minute=30,
        id='auto_clockout_weekday_job'
    )
    
    # Add job to run Saturday at 1:00 PM for half-day auto-clockout
    # (1st, 3rd, 5th Saturday handled via is_saturday_halfday check in service)
    scheduler.add_job(
        auto_clockout_all_active_sessions,
        'cron',
        day_of_week=5,  # Saturday
        hour=13,
        minute=0,
        id='auto_clockout_saturday_halfday_job'
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
    logger.info("   - Auto clock-out job scheduled")
    logger.info("     → Weekdays (Mon-Fri): 6:30 PM")
    logger.info("     → Saturday half-days (1st, 3rd, 5th): 1:00 PM")
    logger.info("   - GPS tracking job scheduled every 3 minutes for active activities")
    
    return scheduler