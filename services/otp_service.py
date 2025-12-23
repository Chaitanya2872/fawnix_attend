"""
OTP Service
OTP generation, validation, and management
"""

import secrets
from datetime import datetime, timedelta
from config import Config
from database.connection import get_db_connection
import logging

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate random OTP code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(Config.OTP_LENGTH)])


def save_otp(emp_code: str, otp: str) -> datetime:
    """Save OTP to database"""
    expires_at = datetime.now() + timedelta(minutes=Config.OTP_EXPIRE_MINUTES)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Invalidate previous OTPs
        cursor.execute("""
            UPDATE otp_codes SET used = true
            WHERE emp_code = %s AND used = false
        """, (emp_code,))
        
        # Insert new OTP
        cursor.execute("""
            INSERT INTO otp_codes (emp_code, otp_code, expires_at)
            VALUES (%s, %s, %s)
        """, (emp_code, otp, expires_at))
        
        conn.commit()
        return expires_at
    finally:
        cursor.close()
        conn.close()


def verify_otp(emp_code: str, otp: str) -> bool:
    """Verify OTP code"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM otp_codes
            WHERE emp_code = %s AND otp_code = %s 
            AND used = false AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """, (emp_code, otp))
        
        otp_record = cursor.fetchone()
        
        if not otp_record:
            return False
        
        # Check attempts if column exists, otherwise skip check
        if 'attempts' in otp_record and otp_record['attempts'] >= Config.OTP_MAX_ATTEMPTS:
            logger.warning(f"Max OTP attempts reached for {emp_code}")
            return False
        
        # Mark as used
        cursor.execute("""
            UPDATE otp_codes SET used = true
            WHERE id = %s
        """, (otp_record['id'],))
        
        conn.commit()
        logger.info(f"OTP verified successfully for {emp_code}")
        return True
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()