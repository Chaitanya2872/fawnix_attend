"""
Employee Management System - Monolithic Application
Main Flask Application Entry Point
FIXED: Proper auto clockout integration with testing and production schedules
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database.connection import init_database, get_db_connection, return_connection
from middleware.auth_middleware import setup_auth_middleware
from middleware.error_handler import register_error_handlers
from middleware.logging_middleware import setup_logging
import atexit
import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    import fcntl  # Linux/Unix process lock for single scheduler leader.
except ImportError:  # pragma: no cover - Windows/local fallback
    fcntl = None


APP_TIMEZONE = os.environ.get("AUTO_CLOCKOUT_TIMEZONE", "Asia/Kolkata")
try:
    ZoneInfo(APP_TIMEZONE)
except ZoneInfoNotFoundError:
    APP_TIMEZONE = "Asia/Kolkata"
os.environ["TZ"] = APP_TIMEZONE
if hasattr(time, 'tzset'):
    time.tzset()

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Setup CORS
CORS(app, resources={
    r"/api/*": {
        "origins": Config.CORS_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Setup logging
setup_logging(app)
logger = logging.getLogger(__name__)
scheduler_instance = None
scheduler_lock_handle = None
scheduler_lock_path = None
scheduler_shutdown_hook_registered = False

# Setup middleware
setup_auth_middleware(app)
register_error_handlers(app)

# ==========================================
# IMPORT AND REGISTER BLUEPRINTS
# ==========================================

# Existing routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.attendance import attendance_bp
from routes.activities import activities_bp
from routes.leaves import leaves_bp
from routes.admin import admin_bp
from routes.tracking import tracking_bp
from routes.compoff import compoff_bp
from routes.attendance_exceptions import exceptions_bp
from routes.holidays import holidays_bp

# ✨ NEW ROUTES - Location Reports, Distance Monitoring, Approvals
from routes.location import location_report_bp
from routes.distance import distance_bp
from routes.approval import approvals_bp

# Register existing blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(activities_bp, url_prefix='/api/activities')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(tracking_bp, url_prefix='/api/tracking')
app.register_blueprint(compoff_bp, url_prefix='/api/compoff')
app.register_blueprint(exceptions_bp, url_prefix='/api/attendance-exceptions')

# ✨ Register new blueprints
app.register_blueprint(location_report_bp, url_prefix='/api/reports')
app.register_blueprint(distance_bp, url_prefix='/api/distance')
app.register_blueprint(approvals_bp, url_prefix='/api/approvals')
app.register_blueprint(holidays_bp, url_prefix = '/api/holidays')
# ==========================================
# ✅ FIXED: Auto Clockout Job
# ==========================================
def auto_clockout_job():
    """
    Scheduled job wrapper that calls the proper auto clockout service
    """
    from services.auto_clockout_service import auto_clockout_all_active_sessions
    
    timezone_name, timezone_obj = _resolve_scheduler_timezone()
    logger.info("=" * 80)
    logger.info("⏰ AUTO CLOCKOUT JOB TRIGGERED")
    logger.info(
        "⏰ Current time: %s (%s)",
        datetime.now(timezone_obj).strftime('%Y-%m-%d %H:%M:%S'),
        timezone_name
    )
    logger.info("=" * 80)
    
    try:
        # Call the proper service function
        result = auto_clockout_all_active_sessions()
        
        if result['success']:
            logger.info(f"✅ AUTO CLOCKOUT SUCCESS: {result['message']}")
            logger.info(f"📊 Employees processed: {result['auto_clocked_out']}")
            if result.get('details'):
                for detail in result['details']:
                    logger.info(f"   • {detail['employee_name']} ({detail['employee_email']})")
                    logger.info(f"     Working hours: {detail['working_hours']}h")
                    logger.info(f"     Activities closed: {detail['activities_closed']}")
                    logger.info(f"     Field visits closed: {detail['field_visits_closed']}")
        else:
            logger.warning(f"⚠️ AUTO CLOCKOUT SKIPPED: {result['message']}")
        
        logger.info("=" * 80)
        return result
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"❌ AUTO CLOCKOUT JOB FAILED: {e}")
        import traceback
        logger.error(traceback.format_exc())
        logger.error("=" * 80)
        return {
            "success": False,
            "message": str(e),
            "auto_clocked_out": 0
        }


def _env_to_bool(value, default=False):
    """Parse a bool env var safely."""
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_positive_int(raw_value, default_value, label):
    """Parse positive integer from env with fallback."""
    try:
        parsed = int(raw_value)
        if parsed < 1:
            raise ValueError(f"{label} must be >= 1")
        return parsed
    except Exception:
        logger.warning("%s='%s' is invalid. Falling back to %s.", label, raw_value, default_value)
        return default_value


def _resolve_scheduler_timezone():
    """Resolve timezone from env; fallback safely to Asia/Kolkata."""
    timezone_name = os.environ.get("AUTO_CLOCKOUT_TIMEZONE", "Asia/Kolkata")
    try:
        timezone_obj = ZoneInfo(timezone_name)
        return timezone_name, timezone_obj
    except ZoneInfoNotFoundError:
        logger.warning(
            "Invalid AUTO_CLOCKOUT_TIMEZONE='%s'. Falling back to 'Asia/Kolkata'.",
            timezone_name
        )
        try:
            return "Asia/Kolkata", ZoneInfo("Asia/Kolkata")
        except ZoneInfoNotFoundError:
            logger.warning("Zoneinfo database unavailable. Falling back to UTC.")
            return "UTC", dt_timezone.utc


def _get_default_scheduler_lock_file():
    """Default lock file path; overridable via AUTO_CLOCKOUT_LOCK_FILE."""
    if os.name == "posix":
        return "/tmp/fawnix-auto-clockout-scheduler.lock"
    return os.path.join(os.getcwd(), "fawnix-auto-clockout-scheduler.lock")


def _acquire_scheduler_process_lock(lock_file_path):
    """
    Acquire non-blocking process lock.
    Returns True only for the process that should run the scheduler.
    """
    global scheduler_lock_handle, scheduler_lock_path

    if scheduler_lock_handle:
        return True

    if fcntl is None:
        logger.warning(
            "Process lock unavailable on this platform; skipping cross-process scheduler lock."
        )
        return True

    lock_dir = os.path.dirname(lock_file_path)
    if lock_dir:
        os.makedirs(lock_dir, exist_ok=True)

    lock_handle = open(lock_file_path, "a+")
    try:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock_handle.close()
        return False

    lock_handle.seek(0)
    lock_handle.truncate()
    lock_handle.write(str(os.getpid()))
    lock_handle.flush()

    scheduler_lock_handle = lock_handle
    scheduler_lock_path = lock_file_path
    return True


def _release_scheduler_process_lock():
    """Release process lock used for scheduler leader election."""
    global scheduler_lock_handle, scheduler_lock_path

    if not scheduler_lock_handle:
        return

    try:
        if fcntl is not None:
            fcntl.flock(scheduler_lock_handle.fileno(), fcntl.LOCK_UN)
    except Exception as e:
        logger.warning("Failed to release scheduler process lock cleanly: %s", e)
    finally:
        try:
            scheduler_lock_handle.close()
        except Exception:
            pass
        scheduler_lock_handle = None
        scheduler_lock_path = None


def stop_scheduler():
    """Gracefully stop scheduler and release leader lock."""
    global scheduler_instance

    if scheduler_instance:
        try:
            if scheduler_instance.running:
                scheduler_instance.shutdown(wait=False)
                logger.info("🛑 APScheduler stopped")
        except Exception as e:
            logger.warning("Scheduler shutdown raised an error: %s", e)
        finally:
            scheduler_instance = None

    _release_scheduler_process_lock()


def _register_scheduler_shutdown_hook():
    """Register one-time process shutdown hook for scheduler cleanup."""
    global scheduler_shutdown_hook_registered

    if scheduler_shutdown_hook_registered:
        return

    atexit.register(stop_scheduler)
    scheduler_shutdown_hook_registered = True


def _parse_clock_times(raw_times: str):
    """Parse comma-separated HH:MM times into unique (hour, minute) tuples."""
    parsed_times = []
    seen = set()

    for raw_value in raw_times.split(","):
        value = raw_value.strip()
        if not value:
            continue

        try:
            hour_text, minute_text = value.split(":")
            hour = int(hour_text)
            minute = int(minute_text)
        except ValueError as exc:
            raise ValueError(f"Invalid time '{value}'. Expected HH:MM in 24-hour format.") from exc

        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            raise ValueError(f"Invalid time '{value}'. Hour must be 00-23 and minute must be 00-59.")

        if (hour, minute) in seen:
            continue

        seen.add((hour, minute))
        parsed_times.append((hour, minute))

    if not parsed_times:
        raise ValueError("At least one auto clock-out time is required.")

    return parsed_times


def get_auto_clockout_schedule_config():
    """
    Build auto clock-out scheduler config from env vars.
    Defaults:
    - Testing mode: 03:00 daily
    - Production mode: 18:30 and 23:59 daily
    """
    timezone_name, scheduler_timezone = _resolve_scheduler_timezone()
    schedule_mode = os.environ.get("AUTO_CLOCKOUT_SCHEDULE_MODE", "production").strip().lower()

    if schedule_mode not in {"testing", "production"}:
        logger.warning(
            "Invalid AUTO_CLOCKOUT_SCHEDULE_MODE='%s'. Falling back to 'production'.",
            schedule_mode
        )
        schedule_mode = "production"

    testing_times = os.environ.get("AUTO_CLOCKOUT_TEST_TIMES") or os.environ.get(
        "AUTO_CLOCKOUT_TEST_TIME", "03:00"
    )
    production_times = os.environ.get("AUTO_CLOCKOUT_PRODUCTION_TIMES", "18:30,23:59")
    misfire_grace_seconds = _parse_positive_int(
        os.environ.get("AUTO_CLOCKOUT_MISFIRE_GRACE_SECONDS", "900"),
        900,
        "AUTO_CLOCKOUT_MISFIRE_GRACE_SECONDS"
    )
    max_instances = _parse_positive_int(
        os.environ.get("AUTO_CLOCKOUT_MAX_INSTANCES", "1"),
        1,
        "AUTO_CLOCKOUT_MAX_INSTANCES"
    )
    coalesce = _env_to_bool(os.environ.get("AUTO_CLOCKOUT_COALESCE", "true"), default=True)
    enforce_single_process = _env_to_bool(
        os.environ.get("AUTO_CLOCKOUT_ENFORCE_SINGLE_PROCESS", "true"),
        default=True
    )
    lock_file = os.environ.get("AUTO_CLOCKOUT_LOCK_FILE", _get_default_scheduler_lock_file())

    selected_raw_times = production_times if schedule_mode == "production" else testing_times
    default_selected = "18:30,23:59" if schedule_mode == "production" else "03:00"

    try:
        active_times = _parse_clock_times(selected_raw_times)
    except ValueError as exc:
        logger.warning(
            "Invalid auto clock-out schedule '%s' for mode '%s': %s. Falling back to '%s'.",
            selected_raw_times,
            schedule_mode,
            exc,
            default_selected
        )
        active_times = _parse_clock_times(default_selected)
        selected_raw_times = default_selected

    return {
        "timezone_name": timezone_name,
        "timezone": scheduler_timezone,
        "mode": schedule_mode,
        "active_times": active_times,
        "active_times_text": ", ".join(f"{hour:02d}:{minute:02d}" for hour, minute in active_times),
        "testing_times": testing_times,
        "production_times": production_times,
        "selected_raw_times": selected_raw_times,
        "misfire_grace_seconds": misfire_grace_seconds,
        "max_instances": max_instances,
        "coalesce": coalesce,
        "enforce_single_process": enforce_single_process,
        "lock_file": lock_file
    }


@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Employee Management System',
        'version': '2.0.0',
        'architecture': 'monolithic',
        'new_features': [
            'Refresh Token System (7 days)',
            'Location Reports (Daily/Weekly)',
            'Distance Monitoring (Smart 1km checks)',
            'Activity Approvals (Late Arrival/Early Leave)',
            'Auto Clock-out with Activity Cleanup'
        ],
        'endpoints': {
            'auth': '/api/auth',
            'users': '/api/users',
            'attendance': '/api/attendance',
            'activities': '/api/activities',
            'admin': '/api/admin',
            'leaves': '/api/leaves',
            'tracking': '/api/tracking',
            'compoff': '/api/compoff',
            'reports': '/api/reports',
            'distance': '/api/distance',
            'approvals': '/api/approvals'
        },
        'docs': '/api/docs',
        'health': '/health'
    }), 200


@app.route('/health')
def health_check():
    """Health check endpoint"""
    schedule_config = get_auto_clockout_schedule_config()
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        
        return jsonify({
            'status': 'healthy',
            'service': 'employee-management-system',
            'database': 'connected',
            'version': '2.0.0',
            'features': {
                'refresh_tokens': 'active',
                'location_reports': 'active',
                'distance_monitoring': 'active',
                'activity_approvals': 'active',
                'auto_clockout': 'active'
            },
            'auto_clockout': {
                'enabled': True,
                'mode': schedule_config['mode'],
                'active_schedule': f"{schedule_config['active_times_text']} daily ({schedule_config['timezone_name']})",
                'testing_schedule': f"{schedule_config['testing_times']} daily",
                'production_schedule': f"{schedule_config['production_times']} daily",
                'misfire_grace_seconds': schedule_config['misfire_grace_seconds']
            }
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'employee-management-system',
            'database': 'disconnected',
            'error': str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)


@app.route('/api/docs')
def api_docs():
    """API documentation endpoint"""
    return jsonify({
        'api_version': '2.0.0',
        'base_url': '/api',
        'endpoints': {
            'authentication': {
                'POST /api/auth/request-otp': 'Request OTP for login',
                'POST /api/auth/verify-otp': 'Verify OTP and get JWT token + refresh token (7 days)',
                'POST /api/auth/refresh': '✨ NEW: Refresh access token using refresh token',
                'POST /api/auth/logout': 'Logout user (single device or all devices)',
                'GET /api/auth/sessions': '✨ NEW: List active sessions (all logged-in devices)',
                'DELETE /api/auth/sessions/{id}': '✨ NEW: Revoke specific session',
                'GET /api/auth/me': 'Get current user profile'
            },
            'users': {
                'GET /api/users': 'List all users (USER_MANAGER/ADMIN)',
                'GET /api/users/{emp_code}': 'Get user by employee code',
                'POST /api/users': 'Create new user (USER_MANAGER/ADMIN)',
                'PUT /api/users/{emp_code}': 'Update user (USER_MANAGER/ADMIN)',
                'DELETE /api/users/{emp_code}': 'Deactivate user (USER_MANAGER/ADMIN)'
            },
            'attendance': {
                'POST /api/attendance/login': 'Clock in',
                'POST /api/attendance/logout': 'Clock out',
                'GET /api/attendance/status': 'Get attendance status',
                'GET /api/attendance/history': 'Get attendance history'
            },
            'activities': {
                'POST /api/activities/start': 'Start activity',
                'POST /api/activities/end': 'End activity',
                'GET /api/activities': 'List activities',
                'POST /api/activities/break/start': 'Start break',
                'POST /api/activities/break/end': 'End break'
            },
            'location_reports': {
                'GET /api/reports/daily': '✨ NEW: Daily location report with all coordinates',
                'GET /api/reports/weekly': '✨ NEW: Weekly location summary'
            },
            'distance_monitoring': {
                'POST /api/distance/check': '✨ NEW: Check if employee moved >1km (smart detection)',
                'GET /api/distance/alerts': '✨ NEW: Get distance alerts for employee',
                'POST /api/distance/clear/{id}': '✨ NEW: Clear/acknowledge distance alert'
            },
            'activity_approvals': {
                'POST /api/approvals/late-arrival/request': '✨ NEW: Request late arrival approval',
                'POST /api/approvals/early-leave/request': '✨ NEW: Request early leave approval',
                'POST /api/approvals/approve': '✨ NEW: Approve/reject attendance exception',
                'GET /api/approvals/my-requests': '✨ NEW: Get my approval requests',
                'GET /api/approvals/team-requests': '✨ NEW: Get team requests (managers only)'
            },
            'leaves': {
                'GET /api/leaves': 'Get leave history',
                'POST /api/leaves': 'Apply for leave',
                'PUT /api/leaves/{id}': 'Update leave status'
            },
            'compoff': {
                'GET /api/compoff': 'Get comp-off balance',
                'POST /api/compoff': 'Request comp-off'
            },
            'admin': {
                'POST /api/admin/assign-role': 'Assign role to user',
                'GET /api/admin/stats': 'Get system statistics'
            },
            'tracking': {
                'POST /api/tracking/location': 'Update location',
                'GET /api/tracking/history': 'Get tracking history'
            }
        },
        'new_features_v2': {
            'refresh_tokens': {
                'description': 'Secure token refresh with 7-day expiration',
                'endpoints': ['/api/auth/refresh', '/api/auth/sessions']
            },
            'location_reports': {
                'description': 'Complete daily/weekly location tracking reports',
                'endpoints': ['/api/reports/daily', '/api/reports/weekly']
            },
            'distance_monitoring': {
                'description': 'Smart 1km distance checks (only when moving on working days)',
                'endpoints': ['/api/distance/check', '/api/distance/alerts']
            },
            'activity_approvals': {
                'description': 'Manager approval system for late arrivals and early leaves',
                'endpoints': ['/api/approvals/late-arrival/request', '/api/approvals/approve']
            },
            'auto_clockout': {
                'description': 'Automatic clock-out with activity cleanup and comp-off calculation',
                'schedule': '03:00 daily (TESTING) | 18:30, 23:59 daily (PRODUCTION)',
                'features': [
                    'Auto-closes all active activities',
                    'Auto-closes all active field visits',
                    'Calculates comp-off eligibility',
                    'Marks records with auto_clocked_out flag'
                ]
            }
        }
    }), 200


@app.route('/api/features')
def features():
    """List all available features"""
    return jsonify({
        'version': '2.0.0',
        'features': {
            'core': [
                'JWT Authentication',
                'Role-based Access Control',
                'Attendance Management',
                'Activity Tracking',
                'Leave Management',
                'Comp-off Management'
            ],
            'new_in_v2': [
                {
                    'name': 'Refresh Token System',
                    'description': 'Secure 7-day refresh tokens with automatic rotation',
                    'status': 'active',
                    'endpoints': [
                        'POST /api/auth/refresh',
                        'GET /api/auth/sessions',
                        'DELETE /api/auth/sessions/{id}'
                    ]
                },
                {
                    'name': 'Location Reports',
                    'description': 'Daily and weekly reports with complete coordinate history',
                    'status': 'active',
                    'endpoints': [
                        'GET /api/reports/daily',
                        'GET /api/reports/weekly'
                    ]
                },
                {
                    'name': 'Distance Monitoring',
                    'description': 'Smart 1km checks (only when moving on working days)',
                    'status': 'active',
                    'endpoints': [
                        'POST /api/distance/check',
                        'GET /api/distance/alerts'
                    ]
                },
                {
                    'name': 'Activity Approvals',
                    'description': 'Manager approval workflow for late arrivals and early leaves',
                    'status': 'active',
                    'endpoints': [
                        'POST /api/approvals/late-arrival/request',
                        'POST /api/approvals/early-leave/request',
                        'POST /api/approvals/approve'
                    ]
                },
                {
                    'name': 'Auto Clock-out',
                    'description': 'Automatic clock-out with cleanup',
                    'status': 'active',
                    'schedule': '03:00 daily (TESTING) | 18:30, 23:59 daily (PRODUCTION)',
                    'features': [
                        'Activity cleanup',
                        'Field visit cleanup',
                        'Comp-off calculation',
                        'Auto-clockout flagging'
                    ]
                }
            ]
        }
    }), 200


@app.before_request
def before_request():
    """Log all incoming requests"""
    from flask import request
    logger.info(f"{request.method} {request.path} from {request.remote_addr}")


@app.after_request
def after_request(response):
    """Add custom headers to all responses"""
    response.headers['X-Service'] = 'employee-management-system'
    response.headers['X-Version'] = '2.0.0'
    response.headers['X-Architecture'] = 'monolithic'
    response.headers['X-Features'] = 'refresh-tokens,location-reports,distance-monitoring,approvals,auto-clockout'
    return response


# Initialize database on startup
with app.app_context():
    logger.info("=" * 80)
    logger.info("EMPLOYEE MANAGEMENT SYSTEM v2.0.0 - MONOLITHIC APPLICATION")
    logger.info("=" * 80)
    logger.info("\n🆕 NEW FEATURES:")
    logger.info("  ✓ Refresh Token System (7 days)")
    logger.info("  ✓ Location Reports (Daily/Weekly)")
    logger.info("  ✓ Distance Monitoring (Smart 1km checks)")
    logger.info("  ✓ Activity Approvals (Late Arrival/Early Leave)")
    logger.info("  ✓ Auto Clock-out (03:00 TESTING / 18:30, 23:59 PRODUCTION)")
    
    logger.info("\n🔧 Initializing database...")
    try:
        init_database()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        logger.error("Please check your database configuration and try again")
    
    logger.info("\n📋 Available Endpoints:")
    
    logger.info("\n  🔐 Authentication:")
    logger.info("    POST   /api/auth/request-otp")
    logger.info("    POST   /api/auth/verify-otp")
    logger.info("    POST   /api/auth/refresh              ✨ NEW")
    logger.info("    POST   /api/auth/logout")
    logger.info("    GET    /api/auth/sessions             ✨ NEW")
    logger.info("    DELETE /api/auth/sessions/{id}        ✨ NEW")
    logger.info("    GET    /api/auth/me")
    
    logger.info("\n  👤 Users:")
    logger.info("    GET    /api/users")
    logger.info("    GET    /api/users/{emp_code}")
    logger.info("    POST   /api/users")
    logger.info("    PUT    /api/users/{emp_code}")
    
    logger.info("\n  ⏰ Attendance:")
    logger.info("    POST   /api/attendance/login")
    logger.info("    POST   /api/attendance/logout")
    logger.info("    GET    /api/attendance/status")
    logger.info("    GET    /api/attendance/history")
    
    logger.info("\n  📍 Activities:")
    logger.info("    POST   /api/activities/start")
    logger.info("    POST   /api/activities/end")
    logger.info("    GET    /api/activities")
    logger.info("    POST   /api/activities/break/start")
    logger.info("    POST   /api/activities/break/end")
    
    logger.info("\n  📊 Location Reports:                  ✨ NEW")
    logger.info("    GET    /api/reports/daily")
    logger.info("    GET    /api/reports/weekly")
    
    logger.info("\n  📏 Distance Monitoring:                ✨ NEW")
    logger.info("    POST   /api/distance/check")
    logger.info("    GET    /api/distance/alerts")
    logger.info("    POST   /api/distance/clear/{id}")
    
    logger.info("\n  ✅ Activity Approvals:                 ✨ NEW")
    logger.info("    POST   /api/approvals/late-arrival/request")
    logger.info("    POST   /api/approvals/early-leave/request")
    logger.info("    POST   /api/approvals/approve")
    logger.info("    GET    /api/approvals/my-requests")
    logger.info("    GET    /api/approvals/team-requests")
    
    logger.info("\n  📅 Leaves:")
    logger.info("    GET    /api/leaves")
    logger.info("    POST   /api/leaves")
    logger.info("    PUT    /api/leaves/{id}")
    
    logger.info("\n  🔄 Comp-off:")
    logger.info("    GET    /api/compoff")
    logger.info("    POST   /api/compoff")
    
    logger.info("\n  🛡️  Admin:")
    logger.info("    POST   /api/admin/assign-role")
    logger.info("    GET    /api/admin/stats")
    
    logger.info("\n" + "=" * 80)


def start_scheduler(schedule_config=None):
    """
    Initialize and start APScheduler for auto clock-out.
    Schedule is configurable via env:
    - AUTO_CLOCKOUT_SCHEDULE_MODE (testing|production, default: production)
    - AUTO_CLOCKOUT_TEST_TIMES / AUTO_CLOCKOUT_TEST_TIME (default: 03:00)
    - AUTO_CLOCKOUT_PRODUCTION_TIMES (default: 18:30,23:59)
    - AUTO_CLOCKOUT_TIMEZONE (default: Asia/Kolkata)
    - AUTO_CLOCKOUT_MISFIRE_GRACE_SECONDS (default: 900)
    - AUTO_CLOCKOUT_COALESCE (default: true)
    - AUTO_CLOCKOUT_MAX_INSTANCES (default: 1)
    """
    global scheduler_instance

    if scheduler_instance and scheduler_instance.running:
        logger.info("⚠️ APScheduler already running, skipping duplicate start")
        return scheduler_instance

    if schedule_config is None:
        schedule_config = get_auto_clockout_schedule_config()

    scheduler_timezone = schedule_config["timezone"]
    scheduler_timezone_name = schedule_config["timezone_name"]
    active_times = schedule_config["active_times"]

    scheduler = BackgroundScheduler(
        timezone=scheduler_timezone,
        job_defaults={
            "coalesce": schedule_config["coalesce"],
            "max_instances": schedule_config["max_instances"]
        }
    )

    # Register one cron job per configured time.
    for hour, minute in active_times:
        scheduler.add_job(
            auto_clockout_job,
            CronTrigger(hour=hour, minute=minute, timezone=scheduler_timezone),
            id=f"auto_clockout_job_{hour:02d}_{minute:02d}",
            replace_existing=True,
            misfire_grace_time=schedule_config["misfire_grace_seconds"]
        )

    scheduler.start()
    scheduler_instance = scheduler
    _register_scheduler_shutdown_hook()
    logger.info("=" * 80)
    logger.info("🟢 APScheduler started successfully")
    logger.info(
        "⏰ Auto clockout schedule mode: %s | times: %s (%s)",
        schedule_config['mode'],
        schedule_config['active_times_text'],
        scheduler_timezone_name
    )
    logger.info("⏰ Testing schedule: %s (%s)", schedule_config['testing_times'], scheduler_timezone_name)
    logger.info(
        "⏰ Production schedule: %s (%s)",
        schedule_config['production_times'],
        scheduler_timezone_name
    )
    logger.info(
        "⏰ Misfire grace: %ss | coalesce=%s | max_instances=%s",
        schedule_config["misfire_grace_seconds"],
        schedule_config["coalesce"],
        schedule_config["max_instances"]
    )
    for job in scheduler.get_jobs():
        logger.info("📌 Scheduled job %s next run: %s", job.id, job.next_run_time)
    logger.info("=" * 80)
    return scheduler


def maybe_start_scheduler():
    """Start scheduler only when enabled and in the right process."""
    schedule_config = get_auto_clockout_schedule_config()
    run_scheduler = _env_to_bool(os.environ.get("RUN_SCHEDULER", "true"), default=True)
    if not run_scheduler:
        logger.info("⏸️ RUN_SCHEDULER=false, skipping scheduler startup")
        return

    # Avoid duplicate scheduler in Flask debug reloader parent process.
    if Config.DEBUG and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        logger.info("⏸️ Skipping scheduler in Flask reloader parent process")
        return

    if schedule_config["enforce_single_process"]:
        lock_path = schedule_config["lock_file"]
        if not _acquire_scheduler_process_lock(lock_path):
            logger.info(
                "⏸️ Scheduler lock is held by another process. Skipping startup in pid=%s (%s).",
                os.getpid(),
                lock_path
            )
            return
        logger.info("🔒 Scheduler process lock acquired: %s", lock_path)

    try:
        start_scheduler(schedule_config)
    except Exception as e:
        logger.error("Failed to start scheduler: %s", e)
        _release_scheduler_process_lock()


if __name__ == '__main__':
    port = Config.PORT
    debug = Config.DEBUG
    
    logger.info(f"\n🚀 Starting server on http://0.0.0.0:{port}")
    logger.info(f"📖 API Documentation: http://localhost:{port}/api/docs")
    logger.info(f"🆕 New Features: http://localhost:{port}/api/features")
    logger.info(f"💚 Health Check: http://localhost:{port}/health")
    
    logger.info("\n🔑 Token System:")
    logger.info("   • Access Token: 30 minutes")
    logger.info("   • Refresh Token: 7 days")
    logger.info("   • Automatic rotation on refresh")
    
    logger.info("\n✨ New Capabilities:")
    logger.info("   • Daily/weekly location reports")
    logger.info("   • Smart distance monitoring (1km checks)")
    logger.info("   • Manager approval workflows")
    logger.info("   • Multi-device session management")
    logger.info("   • Auto clock-out at 03:00 (testing) / 18:30 and 23:59 (production)\n")
    
    maybe_start_scheduler()

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
else:
    maybe_start_scheduler()
