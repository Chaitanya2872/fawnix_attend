"""
Users Routes
User management endpoints
"""

from flask import Blueprint
from flask import jsonify

users_bp = Blueprint('users', __name__)


@users_bp.route('/', methods=['GET'])
def list_users():
    """List users - placeholder"""
    return jsonify({"message": "User management endpoints"}), 200
