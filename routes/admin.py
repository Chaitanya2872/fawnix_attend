"""
Admin Routes
Administrative endpoints
"""

from flask import Blueprint, jsonify

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
def stats():
    """Get statistics - placeholder"""
    return jsonify({"message": "Admin statistics"}), 200
