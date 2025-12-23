"""
Error Handler Middleware
Global error handling
"""

from flask import jsonify
import logging

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """Register error handlers"""
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Not Found",
            "message": "The requested resource was not found"
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal error: {error}")
        return jsonify({
            "success": False,
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }), 500
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error": "Bad Request",
            "message": str(error)
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "success": False,
            "error": "Unauthorized",
            "message": "Authentication required"
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "success": False,
            "error": "Forbidden",
            "message": "You don't have permission to access this resource"
        }), 403
