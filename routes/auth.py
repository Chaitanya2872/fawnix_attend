"""
Authentication Routes
Login, OTP, and token management endpoints
"""

from flask import Blueprint, request, jsonify
from services import auth_service, otp_service, whatsapp_service
from database.connection import get_db_connection
from middleware.auth_middleware import token_required
from datetime import datetime, date, time
from typing import Dict
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

def serialize_row(row):
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date, time)):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


@auth_bp.route('/request-otp', methods=['POST'])
def request_otp():
    """Request OTP for login"""
    data = request.get_json()
    emp_code = data.get('emp_code')
    
    if not emp_code:
        return jsonify({"success": False, "message": "emp_code is required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT emp_code, emp_full_name, emp_contact, emp_email
            FROM employees WHERE emp_code = %s
        """, (emp_code,))
        
        employee = cursor.fetchone()
        
        if not employee:
            return jsonify({"success": False, "message": "Employee not found"}), 404
        
        if not employee['emp_contact']:
            return jsonify({"success": False, "message": "No contact number"}), 400
        
        # Generate and save OTP
        otp = otp_service.generate_otp()
        otp_service.save_otp(emp_code, otp)
        
        # Send OTP
        sent = whatsapp_service.send_otp(
            employee['emp_contact'],
            otp,
            employee['emp_full_name']
        )
        
        if not sent:
            return jsonify({"success": False, "message": "Failed to send OTP"}), 500
        
        return jsonify({
            "success": True,
            "message": f"OTP sent to {employee['emp_contact'][-4:]}",
            "expires_in_minutes": 5
        }), 200
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and login"""
    data = request.get_json()
    emp_code = data.get('emp_code')
    otp = data.get('otp')
    
    if not emp_code or not otp:
        return jsonify({"success": False, "message": "emp_code and otp required"}), 400
    
    # Verify OTP
    if not otp_service.verify_otp(emp_code, otp):
        return jsonify({"success": False, "message": "Invalid or expired OTP"}), 401
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT emp_code, emp_full_name, emp_email
            FROM employees WHERE emp_code = %s
        """, (emp_code,))
        
        employee = cursor.fetchone()
        
        if not employee:
            return jsonify({"success": False, "message": "Employee not found"}), 404
        
        # Get or create user
        user = auth_service.get_or_create_user(emp_code)
        
        if not user['is_active']:
            return jsonify({"success": False, "message": "Account inactive"}), 403
        
        # Update last login
        auth_service.update_last_login(emp_code)
        
        # Create JWT token
        token = auth_service.create_jwt_token(
            emp_code,
            user['role'],
            employee['emp_email']
        )
        
        return jsonify({
            "success": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "emp_code": emp_code,
                "emp_full_name": employee['emp_full_name'],
                "emp_email": employee['emp_email'],
                "role": user['role']
            }
        }), 200
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT e.*, u.role, u.is_active, u.last_login,
                   b.branch_name,
                   m1.emp_full_name as manager_name,
                   m2.emp_full_name as informing_manager_name
            FROM employees e
            LEFT JOIN users u ON e.emp_code = u.emp_code
            LEFT JOIN branch b ON e.emp_branch_id = b.branch_id
            LEFT JOIN employees m1 ON e.emp_manager = m1.emp_code
            LEFT JOIN employees m2 ON e.emp_informing_manager = m2.emp_code
            WHERE e.emp_code = %s
        """, (current_user['emp_code'],))
        
        profile = cursor.fetchone()
        
        if not profile:
            return jsonify({"success": False, "message": "Profile not found"}), 404
        
        return jsonify({
    "success": True,
    "data": serialize_row(profile)
}), 200

    finally:
        cursor.close()
        conn.close()
