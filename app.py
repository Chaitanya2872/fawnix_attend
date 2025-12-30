"""
Employee Management System - Monolithic Application
Main Flask Application Entry Point
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database.connection import init_database
from middleware.auth_middleware import setup_auth_middleware
from middleware.error_handler import register_error_handlers
from middleware.logging_middleware import setup_logging
import logging

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

# Import and register blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.attendance import attendance_bp
from routes.activities import activities_bp
from routes.leaves import leaves_bp
from routes.admin import admin_bp
from routes.tracking import tracking_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(activities_bp, url_prefix='/api/activities')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
app.register_blueprint(tracking_bp, url_prefix='/api/tracking')


@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Employee Management System',
        'version': '1.0.0',
        'architecture': 'monolithic',
        'endpoints': {
            'auth': '/api/auth',
            'users': '/api/users',
            'attendance': '/api/attendance',
            'activities': '/api/activities',
            'admin': '/api/admin'
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
            'version': '1.0.0'
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
        'api_version': '1.0.0',
        'base_url': '/api',
        'endpoints': {
            'authentication': {
                'POST /api/auth/request-otp': 'Request OTP for login',
                'POST /api/auth/verify-otp': 'Verify OTP and get JWT token',
                'GET /api/auth/me': 'Get current user profile',
                'POST /api/auth/refresh': 'Refresh JWT token',
                'POST /api/auth/logout': 'Logout user'
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
            'admin': {
                'POST /api/admin/assign-role': 'Assign role to user (ADMIN)',
                'GET /api/admin/stats': 'Get system statistics (ADMIN)',
                'POST /api/admin/users/{emp_code}/activate': 'Activate user (ADMIN)',
                'POST /api/admin/users/{emp_code}/deactivate': 'Deactivate user (ADMIN)'
            }
        },
        'authentication': 'Bearer JWT token in Authorization header',
        'roles': ['admin', 'user_manager', 'employee']
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
    response.headers['X-Version'] = '1.0.0'
    response.headers['X-Architecture'] = 'monolithic'
    return response


# Initialize database on startup
with app.app_context():
    logger.info("=" * 70)
    logger.info("EMPLOYEE MANAGEMENT SYSTEM - MONOLITHIC APPLICATION")
    logger.info("=" * 70)
    logger.info("\nInitializing database...")
    try:
        init_database()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        logger.error("Please check your database configuration and try again")
    
    logger.info("\n📋 Available Endpoints:")
    logger.info("  Authentication:")
    logger.info("    POST   /api/auth/request-otp")
    logger.info("    POST   /api/auth/verify-otp")
    logger.info("    GET    /api/auth/me")
    logger.info("\n  Attendance:")
    logger.info("    POST   /api/attendance/login")
    logger.info("    POST   /api/attendance/logout")
    logger.info("    GET    /api/attendance/status")
    logger.info("    GET    /api/attendance/history")
    logger.info("\n  Activities:")
    logger.info("    POST   /api/activities/start")
    logger.info("    POST   /api/activities/end")
    logger.info("    GET    /api/activities")
    logger.info("\n  Admin:")
    logger.info("    POST   /api/admin/assign-role")
    logger.info("    GET    /api/admin/stats")
    
    logger.info("\n" + "=" * 70)


if __name__ == '__main__':
    port = Config.PORT
    debug = Config.DEBUG
    
    logger.info(f"\n>> Starting server on http://0.0.0.0:{port}")
    logger.info(f">> API Documentation: http://localhost:{port}/api/docs")
    logger.info(f">> Health Check: http://localhost:{port}/health\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )