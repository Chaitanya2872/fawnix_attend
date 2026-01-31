"""
Employee Management System - Monolithic Application
Main Flask Application Entry Point
FIXED: Proper auto clockout integration with 12:30 AM testing schedule
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database.connection import init_database
from middleware.auth_middleware import setup_auth_middleware
from middleware.error_handler import register_error_handlers
from middleware.logging_middleware import setup_logging
import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time
from datetime import datetime


os.environ["TZ"] = "Asia/Kolkata"
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


# ==========================================
# ✅ FIXED: Auto Clockout Job
# ==========================================
def auto_clockout_job():
    """
    Scheduled job wrapper that calls the proper auto clockout service
    """
    from services.auto_clockout_service import auto_clockout_all_active_sessions
    
    logger.info("=" * 80)
    logger.info("⏰ AUTO CLOCKOUT JOB TRIGGERED")
    logger.info(f"⏰ Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
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
    from database.connection import get_db_connection
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        
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
                'schedule': '12:30 AM daily (TESTING)',
                'production_schedule': '6:30 PM daily'
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
                'schedule': '12:30 AM daily (TESTING) - 6:30 PM (PRODUCTION)',
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
                    'schedule': '12:30 AM daily (TESTING) - 6:30 PM (PRODUCTION)',
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
    logger.info("  ✓ Auto Clock-out (12:30 AM TESTING / 6:30 PM PRODUCTION)")
    
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


def start_scheduler():
    """
    Initialize and start the APScheduler for auto clockout
    
    ✅ FIXED: Now runs at 12:30 AM daily for testing (6:30 PM for production)
    """
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # ✅ Schedule auto clockout at 12:30 AM daily (TESTING)
    # Change to hour=18, minute=30 for 6:30 PM production
    scheduler.add_job(
        auto_clockout_job,
        CronTrigger(hour=7, minute=5),  # 12:30 AM daily (TESTING)
        id="auto_clockout_job",
        replace_existing=True,
        misfire_grace_time=300  # Allow 5 minutes grace period
    )

    scheduler.start()
    logger.info("=" * 80)
    logger.info("🟢 APScheduler started successfully")
    logger.info("⏰ Auto clockout scheduled: Daily at 12:30 AM IST (TESTING)")
    logger.info("⚠️  For PRODUCTION, change to: hour=18, minute=30 (6:30 PM)")
    logger.info("=" * 80)


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
    logger.info("   • Auto clock-out at 12:30 AM (TESTING) / 6:30 PM (PRODUCTION)\n")
    
    # Start scheduler (only in main process, not in reloader)

    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
    
if os.environ.get("RUN_SCHEDULER", "true") == "true":
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")