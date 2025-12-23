"""
Authentication Middleware
JWT token validation
"""

from flask import request, jsonify
from functools import wraps
from services.auth_service import decode_jwt_token
from database.connection import get_db_connection
import logging

logger = logging.getLogger(__name__)


def token_required(f):
    """Decorator to require JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"success": False, "message": "Invalid token format"}), 401
        
        if not token:
            return jsonify({"success": False, "message": "Token required"}), 401
        
        try:
            payload = decode_jwt_token(token)
            emp_code = payload.get('sub')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    SELECT u.*, e.emp_full_name, e.emp_email
                    FROM users u
                    JOIN employees e ON u.emp_code = e.emp_code
                    WHERE u.emp_code = %s
                """, (emp_code,))
                
                user = cursor.fetchone()
                
                if not user:
                    return jsonify({"success": False, "message": "User not found"}), 401
                
                if not user['is_active']:
                    return jsonify({"success": False, "message": "Account inactive"}), 403
                
                current_user = dict(user)
            finally:
                cursor.close()
                conn.close()
            
            return f(current_user, *args, **kwargs)
        
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return jsonify({"success": False, "message": str(e)}), 401
    
    return decorated


def require_role(*roles):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(current_user, *args, **kwargs):
            if current_user['role'] not in roles:
                return jsonify({
                    "success": False,
                    "message": "Insufficient permissions"
                }), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator


def setup_auth_middleware(app):
    """Setup authentication middleware"""
    logger.info("Authentication middleware configured")
