"""
Authentication Routes with Refresh Token Support
Implements secure token refresh with 7-day expiration
"""

from flask import Blueprint, request, jsonify
from services import auth_service, otp_service, whatsapp_service
from services.auth_service import (
    create_jwt_token,
    create_refresh_token,
    rotate_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    get_user_active_sessions,
    cleanup_expired_tokens
)
from database.connection import get_db_connection
from middleware.auth_middleware import token_required
from datetime import datetime, date, time
from typing import Dict
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)


def serialize_row(row):
    """Serialize database row with datetime handling"""
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date, time)):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


@auth_bp.route('/request-otp', methods=['POST'])
def request_otp():
    """
    Request OTP for login
    
    Request Body:
        {
            "emp_code": "E001"  // required
        }
    """
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
    """
    Verify OTP and login
    
    NEW: Returns both access token (30 min) and refresh token (7 days)
    
    Request Body:
        {
            "emp_code": "E001",        // required
            "otp": "123456",           // required
            "device_info": {           // optional
                "device_name": "iPhone 13",
                "os": "iOS 16",
                "app_version": "1.0.0"
            }
        }
    
    Response:
        {
            "success": true,
            "access_token": "eyJhbGc...",      // 30 minutes
            "refresh_token": "random_secure...", // 7 days
            "token_type": "bearer",
            "expires_in": 1800,  // seconds
            "refresh_expires_in": 604800,  // seconds (7 days)
            "user": {...}
        }
    """
    data = request.get_json()
    emp_code = data.get('emp_code')
    otp = data.get('otp')
    device_info = data.get('device_info', {})
    
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
        
        # Get request metadata
        user_agent = request.headers.get('User-Agent', '')
        ip_address = request.remote_addr
        
        # Create access token (30 minutes)
        access_token = create_jwt_token(
            emp_code,
            user['role'],
            employee['emp_email']
        )
        
        # Create refresh token (7 days)
        refresh_token, token_family, refresh_expires_at = create_refresh_token(
            emp_code,
            employee['emp_email'],
            user_agent,
            ip_address,
            device_info
        )
        
        logger.info(f"✅ Login successful: {emp_code}, Token family: {token_family}")
        
        return jsonify({
            "success": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,  # 30 minutes in seconds
            "refresh_expires_in": 604800,  # 7 days in seconds
            "refresh_expires_at": refresh_expires_at.strftime('%Y-%m-%d %H:%M:%S'),
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


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh access token using refresh token
    
    Request Body:
        {
            "refresh_token": "random_secure_token..."  // required
        }
    
    Response:
        {
            "success": true,
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",  // Token rotation!
            "token_type": "bearer",
            "expires_in": 1800,
            "refresh_expires_in": 604800
        }
    
    Security Features:
    - Old refresh token is revoked (single use)
    - New refresh token is issued (rotation)
    - Detects token reuse attacks
    """
    data = request.get_json()
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({
            "success": False,
            "message": "refresh_token is required"
        }), 400
    
    try:
        # Get request metadata
        user_agent = request.headers.get('User-Agent', '')
        ip_address = request.remote_addr
        
        # Rotate token (revoke old, create new)
        new_access_token, new_refresh_token, refresh_expires_at = rotate_refresh_token(
            refresh_token,
            user_agent,
            ip_address
        )
        
        logger.info(f"✅ Token refreshed successfully")
        
        return jsonify({
            "success": True,
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,
            "refresh_expires_in": 604800,
            "refresh_expires_at": refresh_expires_at.strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Token refresh failed: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 401


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """
    Logout (revoke current refresh token)
    
    Request Body:
        {
            "refresh_token": "token...",  // required
            "logout_all": false            // optional, logout from all devices
        }
    """
    data = request.get_json()
    refresh_token = data.get('refresh_token')
    logout_all = data.get('logout_all', False)
    
    if logout_all:
        # Logout from all devices
        count = revoke_all_user_tokens(current_user['emp_code'], "User logout - all devices")
        return jsonify({
            "success": True,
            "message": f"Logged out from all devices ({count} sessions)"
        }), 200
    
    if not refresh_token:
        return jsonify({
            "success": False,
            "message": "refresh_token is required"
        }), 400
    
    # Revoke single token
    revoked = revoke_refresh_token(refresh_token, "User logout")
    
    if revoked:
        return jsonify({
            "success": True,
            "message": "Logged out successfully"
        }), 200
    else:
        return jsonify({
            "success": False,
            "message": "Token not found or already revoked"
        }), 404


@auth_bp.route('/sessions', methods=['GET'])
@token_required
def list_sessions(current_user):
    """
    Get all active sessions for current user
    
    Shows all devices/browsers where user is logged in
    
    Response:
        {
            "success": true,
            "data": {
                "sessions": [
                    {
                        "id": 123,
                        "issued_at": "2025-01-04 10:00:00",
                        "expires_at": "2025-01-11 10:00:00",
                        "last_used_at": "2025-01-04 15:30:00",
                        "use_count": 5,
                        "user_agent": "Mozilla/5.0...",
                        "ip_address": "192.168.1.1",
                        "device_info": {...}
                    }
                ],
                "count": 3
            }
        }
    """
    sessions = get_user_active_sessions(current_user['emp_code'])
    
    return jsonify({
        "success": True,
        "data": {
            "sessions": sessions,
            "count": len(sessions)
        }
    }), 200


@auth_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@token_required
def revoke_session(current_user, session_id):
    """
    Revoke a specific session (logout from specific device)
    
    Path Params:
        session_id: Refresh token ID
    
    Example:
        DELETE /api/auth/sessions/123
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify session belongs to current user
        cursor.execute("""
            SELECT emp_code, token FROM refresh_tokens
            WHERE id = %s AND emp_code = %s AND is_revoked = FALSE
        """, (session_id, current_user['emp_code']))
        
        session = cursor.fetchone()
        
        if not session:
            return jsonify({
                "success": False,
                "message": "Session not found"
            }), 404
        
        # Revoke token
        revoke_refresh_token(session['token'], f"User revoked session {session_id}")
        
        return jsonify({
            "success": True,
            "message": "Session revoked successfully"
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


# ==========================================
# ADMIN/DEBUG ENDPOINTS (optional)
# ==========================================

@auth_bp.route('/admin/cleanup-tokens', methods=['POST'])
@token_required
def cleanup_tokens(current_user):
    """
    Cleanup expired tokens (Admin only)
    
    Should be run periodically (e.g., daily cron job)
    """
    # Check admin role
    if current_user.get('role') not in ['admin', 'hr']:
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403
    
    deleted_count = cleanup_expired_tokens()
    
    return jsonify({
        "success": True,
        "message": f"Cleaned up {deleted_count} expired tokens"
    }), 200