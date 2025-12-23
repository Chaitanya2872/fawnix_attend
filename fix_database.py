"""
Database Fix Script
Adds missing 'attempts' column to otp_codes table if it doesn't exist
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config


def fix_otp_table():
    """Add attempts column to otp_codes table if missing"""
    try:
        conn = psycopg2.connect(
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            database=Config.DATABASE_NAME,
            user=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            cursor_factory=RealDictCursor
        )
        cursor = conn.cursor()
        
        print("Checking otp_codes table structure...")
        
        # Check if attempts column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'otp_codes' AND column_name = 'attempts'
        """)
        
        column_exists = cursor.fetchone()
        
        if not column_exists:
            print("'attempts' column missing. Adding it now...")
            
            cursor.execute("""
                ALTER TABLE otp_codes 
                ADD COLUMN attempts INTEGER DEFAULT 0
            """)
            
            conn.commit()
            print("✓ Added 'attempts' column to otp_codes table")
        else:
            print("✓ 'attempts' column already exists")
        
        # Verify the fix
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'otp_codes'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        
        print("\nCurrent otp_codes table structure:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} (default: {col['column_default']})")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Database fix completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error fixing database: {e}")
        return False


if __name__ == '__main__':
    print("=" * 70)
    print("DATABASE FIX SCRIPT - Adding 'attempts' column to otp_codes")
    print("=" * 70)
    print()
    
    success = fix_otp_table()
    
    if success:
        print("\nYou can now restart your application!")
    else:
        print("\nPlease fix the error and try again.")
    
    sys.exit(0 if success else 1)