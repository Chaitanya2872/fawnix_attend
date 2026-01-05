"""
Enhanced Authentication Service with Refresh Token
Implements JWT access tokens (short-lived) and refresh tokens (7 days)

FIX: Changed device_info storage from JWT encoding to proper JSON serialization
"""

import jwt
import hashlib
import secrets
import uuid
import json
from datetime import datetime, timedelta
from config import Config
from database.connection import get_db_connection
import logging

logger = logging.getLogger(__name__)

# Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7     # 7 days


def create_jwt_token(emp_code: str, role: str, email: str) -> str:
    """
    Create short-lived JWT access token (30 minutes)
    """
    payload = {
        "sub": emp_code,
        "role": role,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


def create_refresh_token(emp_code: str, email: str, user_agent: str = None, 
                         ip_address: str = None, device_info: dict = None) -> tuple:
    """
    Create long-lived refresh token (7 days)
    
    Returns:
        (token, token_family, expires_at)
    
    Security Features:
    - Random secure token
    - Hashed storage
    - Token family for rotation tracking
    - Device/IP tracking
    
    FIX: device_info is now stored as JSON instead of JWT encoded
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Generate secure random token
        token = secrets.token_urlsafe(64)  # 64 bytes = 512 bits
        
        # Hash token for storage (never store plain token)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Generate token family UUID (for rotation tracking)
        token_family = str(uuid.uuid4())
        
        # Calculate expiration
        issued_at = datetime.now()
        expires_at = issued_at + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        # FIX: Convert device_info to JSON string if present
        device_info_json = json.dumps(device_info) if device_info else None
        
        # Store refresh token
        cursor.execute("""
            INSERT INTO refresh_tokens (
                token, token_hash, emp_code, emp_email,
                issued_at, expires_at, token_family,
                user_agent, ip_address, device_info
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            token, token_hash, emp_code, email,
            issued_at, expires_at, token_family,
            user_agent, ip_address, 
            device_info_json  # FIX: Use JSON string instead of JWT encoded
        ))
        
        token_id = cursor.fetchone()['id']
        conn.commit()
        
        logger.info(f"✅ Refresh token created for {emp_code}, ID: {token_id}, Family: {token_family}")
        
        return (token, token_family, expires_at)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Create refresh token error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def verify_refresh_token(token: str) -> dict:
    """
    Verify refresh token and return user info
    
    Returns:
        {
            "emp_code": str,
            "emp_email": str,
            "token_id": int,
            "token_family": str,
            "previous_token_id": int or None
        }
    
    Raises:
        Exception if token is invalid, expired, or revoked
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Hash the provided token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Look up token
        cursor.execute("""
            SELECT 
                id, emp_code, emp_email, token_family,
                expires_at, is_revoked, revoked_reason,
                use_count, previous_token_id
            FROM refresh_tokens
            WHERE token_hash = %s
        """, (token_hash,))
        
        token_data = cursor.fetchone()
        
        if not token_data:
            logger.warning("⚠️  Refresh token not found")
            raise Exception("Invalid refresh token")
        
        # Check if revoked
        if token_data['is_revoked']:
            reason = token_data['revoked_reason'] or 'Token revoked'
            logger.warning(f"⚠️  Token revoked: {reason}")
            
            # SECURITY: If refresh token is reused, revoke entire token family
            # This detects potential token theft
            revoke_token_family(token_data['token_family'])
            
            raise Exception(f"Token revoked: {reason}")
        
        # Check if expired
        if token_data['expires_at'] < datetime.now():
            logger.warning("⚠️  Refresh token expired")
            raise Exception("Refresh token expired")
        
        # Update last used
        cursor.execute("""
            UPDATE refresh_tokens
            SET 
                last_used_at = NOW(),
                use_count = use_count + 1
            WHERE id = %s
        """, (token_data['id'],))
        conn.commit()
        
        return {
            "emp_code": token_data['emp_code'],
            "emp_email": token_data['emp_email'],
            "token_id": token_data['id'],
            "token_family": token_data['token_family'],
            "previous_token_id": token_data.get('previous_token_id')
        }
        
    except Exception as e:
        logger.error(f"❌ Verify refresh token error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def rotate_refresh_token(old_token: str, user_agent: str = None, 
                         ip_address: str = None) -> tuple:
    """
    Rotate refresh token (invalidate old, create new)
    
    Security: Token rotation prevents token reuse attacks
    
    Returns:
        (new_access_token, new_refresh_token, refresh_expires_at)
    
    Raises:
        Exception if old token is invalid
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify old token
        token_info = verify_refresh_token(old_token)
        
        emp_code = token_info['emp_code']
        emp_email = token_info['emp_email']
        old_token_id = token_info['token_id']
        token_family = token_info['token_family']
        
        # Get user role for new access token
        cursor.execute("""
            SELECT role FROM users WHERE emp_code = %s
        """, (emp_code,))
        
        user = cursor.fetchone()
        if not user:
            raise Exception("User not found")
        
        role = user['role']
        
        # Revoke old token
        cursor.execute("""
            UPDATE refresh_tokens
            SET 
                is_revoked = TRUE,
                revoked_at = NOW(),
                revoked_reason = 'Token rotated'
            WHERE id = %s
        """, (old_token_id,))
        
        # Create new tokens
        new_access_token = create_jwt_token(emp_code, role, emp_email)
        
        # Generate new refresh token (same family)
        new_refresh_token = secrets.token_urlsafe(64)
        new_token_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
        
        issued_at = datetime.now()
        expires_at = issued_at + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Store new refresh token with link to old one
        cursor.execute("""
            INSERT INTO refresh_tokens (
                token, token_hash, emp_code, emp_email,
                issued_at, expires_at, token_family,
                previous_token_id, user_agent, ip_address
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            new_refresh_token, new_token_hash, emp_code, emp_email,
            issued_at, expires_at, token_family,
            old_token_id, user_agent, ip_address
        ))
        
        new_token_id = cursor.fetchone()['id']
        conn.commit()
        
        logger.info(f"✅ Token rotated for {emp_code}: {old_token_id} → {new_token_id}")
        
        return (new_access_token, new_refresh_token, expires_at)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Rotate token error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def revoke_refresh_token(token: str, reason: str = "User logout") -> bool:
    """
    Revoke a specific refresh token
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        cursor.execute("""
            UPDATE refresh_tokens
            SET 
                is_revoked = TRUE,
                revoked_at = NOW(),
                revoked_reason = %s
            WHERE token_hash = %s AND is_revoked = FALSE
        """, (reason, token_hash))
        
        conn.commit()
        revoked = cursor.rowcount > 0
        
        if revoked:
            logger.info(f"✅ Token revoked: {reason}")
        
        return revoked
        
    finally:
        cursor.close()
        conn.close()


def revoke_token_family(token_family: str) -> int:
    """
    Revoke all tokens in a token family
    
    Security: Called when token reuse is detected (potential theft)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE refresh_tokens
            SET 
                is_revoked = TRUE,
                revoked_at = NOW(),
                revoked_reason = 'Security: Token family revoked due to suspicious activity'
            WHERE token_family = %s AND is_revoked = FALSE
        """, (token_family,))
        
        conn.commit()
        revoked_count = cursor.rowcount
        
        logger.warning(f"🚨 SECURITY: Token family revoked: {token_family}, Count: {revoked_count}")
        
        return revoked_count
        
    finally:
        cursor.close()
        conn.close()


def revoke_all_user_tokens(emp_code: str, reason: str = "User logout") -> int:
    """
    Revoke all refresh tokens for a user (logout from all devices)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE refresh_tokens
            SET 
                is_revoked = TRUE,
                revoked_at = NOW(),
                revoked_reason = %s
            WHERE emp_code = %s AND is_revoked = FALSE
        """, (reason, emp_code))
        
        conn.commit()
        revoked_count = cursor.rowcount
        
        logger.info(f"✅ All tokens revoked for {emp_code}: {revoked_count} tokens")
        
        return revoked_count
        
    finally:
        cursor.close()
        conn.close()


def get_user_active_sessions(emp_code: str) -> list:
    """
    Get all active sessions (refresh tokens) for a user
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT 
                id,
                issued_at,
                expires_at,
                last_used_at,
                use_count,
                user_agent,
                ip_address,
                device_info
            FROM refresh_tokens
            WHERE emp_code = %s
            AND is_revoked = FALSE
            AND expires_at > NOW()
            ORDER BY last_used_at DESC NULLS LAST, issued_at DESC
        """, (emp_code,))
        
        sessions = cursor.fetchall()
        
        # Format dates and parse device_info JSON
        for session in sessions:
            for key, value in session.items():
                if isinstance(value, datetime):
                    session[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                # FIX: Parse device_info JSON string back to dict
                elif key == 'device_info' and value:
                    try:
                        session[key] = json.loads(value) if isinstance(value, str) else value
                    except:
                        pass
        
        return sessions
        
    finally:
        cursor.close()
        conn.close()


def cleanup_expired_tokens() -> int:
    """
    Cleanup expired tokens older than 30 days
    Should be run periodically (e.g., daily cron job)
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW() - INTERVAL '30 days'
            OR (is_revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days')
        """)
        
        conn.commit()
        deleted_count = cursor.rowcount
        
        logger.info(f"🧹 Cleaned up {deleted_count} expired tokens")
        
        return deleted_count
        
    finally:
        cursor.close()
        conn.close()


# ==========================================
# Original functions (keep for compatibility)
# ==========================================

def decode_jwt_token(token: str) -> dict:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.JWTError:
        raise Exception("Invalid token")


def get_or_create_user(emp_code: str) -> dict:
    """Get existing user or create new one"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM users WHERE emp_code = %s", (emp_code,))
        user = cursor.fetchone()
        
        if not user:
            cursor.execute("""
                INSERT INTO users (emp_code, role, is_active)
                VALUES (%s, 'employee', true)
                RETURNING *
            """, (emp_code,))
            user = cursor.fetchone()
            conn.commit()
            logger.info(f"New user created: {emp_code}")
        
        return dict(user)
    finally:
        cursor.close()
        conn.close()


def update_last_login(emp_code: str):
    """Update user's last login timestamp"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE users 
            SET last_login = NOW(), updated_at = NOW()
            WHERE emp_code = %s
        """, (emp_code,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()