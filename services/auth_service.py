"""
Authentication Service
Business logic for authentication and JWT management
"""

import jwt
from datetime import datetime, timedelta
from config import Config
from database.connection import get_db_connection
import logging

logger = logging.getLogger(__name__)


def create_jwt_token(emp_code: str, role: str, email: str) -> str:
    """Create JWT access token"""
    payload = {
        "sub": emp_code,
        "role": role,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=Config.JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


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
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE emp_code = %s", (emp_code,))
        user = cursor.fetchone()
        
        if not user:
            # Create new user with employee role
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
