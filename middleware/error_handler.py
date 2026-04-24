"""
Error Handler Middleware
Global error handling
"""

from flask import jsonify
import logging

logger = logging.getLogger(__name__)


def _format_max_upload_size(max_bytes):
    """Return a readable upload size string for 413 responses."""
    if not max_bytes:
        return "0 bytes"
    if max_bytes < 1024 * 1024:
        return f"{max_bytes} bytes"
    if max_bytes % (1024 * 1024) == 0:
        return f"{max_bytes // (1024 * 1024)} MB"
    return f"{max_bytes / (1024 * 1024):.1f} MB"


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

    @app.errorhandler(413)
    def request_entity_too_large(error):
        max_upload_size = _format_max_upload_size(app.config.get('MAX_CONTENT_LENGTH', 0))
        return jsonify({
            "success": False,
            "error": "Request Entity Too Large",
            "message": f"Uploaded file is too large. Maximum request size is {max_upload_size}."
        }), 413
