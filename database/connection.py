"""
Database Connection and Initialization
PostgreSQL connection management
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from config import Config
import logging

logger = logging.getLogger(__name__)


def get_db_connection():
    """
    Get database connection with RealDictCursor
    Returns connection object
    """
    try:
        conn = psycopg2.connect(
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            database=Config.DATABASE_NAME,
            user=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise


def init_database():
    """Initialize all database tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        logger.info("Initializing database tables...")
        
        # ==================== STEP 1: INDEPENDENT TABLES ====================
        
        # 1. Shifts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS shifts (
                shift_id SERIAL PRIMARY KEY,
                shift_name VARCHAR(50) NOT NULL UNIQUE,
                shift_start_time TIME NOT NULL,
                shift_end_time TIME NOT NULL,
                shift_duration_hours NUMERIC(3,1),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO shifts (shift_name, shift_start_time, shift_end_time, shift_duration_hours)
            VALUES 
                ('Morning Shift', '09:00:00', '18:00:00', 9.0),
                ('Evening Shift', '14:00:00', '23:00:00', 9.0),
                ('Night Shift', '22:00:00', '07:00:00', 9.0)
            ON CONFLICT (shift_name) DO NOTHING
        """)
        logger.info("✓ Shifts table ready")
        
        # 2. Organization holidays
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organization_holidays (
                id SERIAL PRIMARY KEY,
                holiday_date DATE NOT NULL UNIQUE,
                holiday_name VARCHAR(255) NOT NULL,
                is_mandatory BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        logger.info("✓ Organization holidays table ready")
        
        # 3. Add columns to employees if missing
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='emp_shift_id'
                ) THEN
                    ALTER TABLE employees ADD COLUMN emp_shift_id INTEGER 
                    REFERENCES shifts(shift_id) DEFAULT 1;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='employees' AND column_name='emp_joining_date'
                ) THEN
                    ALTER TABLE employees ADD COLUMN emp_joining_date DATE 
                    DEFAULT CURRENT_DATE;
                END IF;
            END $$;
        """)
        logger.info("✓ Employees table columns updated")
        
        # ==================== STEP 2: TABLES WITHOUT FK ====================
        
        # 4. Users table (NO FK YET)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                emp_code VARCHAR(50) PRIMARY KEY,
                role VARCHAR(20) DEFAULT 'employee',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)
        logger.info("✓ Users table created")
        
        # 5. OTP codes (NO FK YET)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                attempts INTEGER DEFAULT 0
            )
        """)
        logger.info("✓ OTP codes table created")
        
        # 6. Attendance (no FK - uses email)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                employee_email VARCHAR(255) NOT NULL,
                employee_name VARCHAR(255),
                phone_number VARCHAR(20),
                login_time TIMESTAMP NOT NULL,
                logout_time TIMESTAMP,
                login_location VARCHAR(255),
                login_address TEXT,
                logout_location VARCHAR(255),
                logout_address TEXT,
                working_hours NUMERIC(4,2),
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'logged_in',
                alert_sent BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        logger.info("✓ Attendance table created")
        
        # 7. Activities (no FK - uses email)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                employee_email VARCHAR(255) NOT NULL,
                employee_name VARCHAR(255),
                activity_type VARCHAR(50) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                start_location VARCHAR(255),
                start_address TEXT,
                end_location VARCHAR(255),
                end_address TEXT,
                duration_minutes INTEGER,
                notes TEXT,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        logger.info("✓ Activities table created")
        
        # 8. Leaves (NO FK YET)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leaves (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                emp_name VARCHAR(255) NOT NULL,
                emp_email VARCHAR(255) NOT NULL,
                manager_code VARCHAR(50),
                manager_email VARCHAR(255),
                from_date DATE NOT NULL,
                to_date DATE NOT NULL,
                leave_type VARCHAR(20) NOT NULL,
                duration VARCHAR(20) NOT NULL,
                leave_count NUMERIC(3,1) NOT NULL,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                applied_at TIMESTAMP NOT NULL,
                reviewed_by VARCHAR(50),
                reviewed_at TIMESTAMP,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
                CHECK (leave_type IN ('casual', 'sick', 'annual', 'monthly')),
                CHECK (duration IN ('full_day', 'first_half', 'second_half'))
            )
        """)
        logger.info("✓ Leaves table created")
        
        # 9. Comp-offs (NO FK YET)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comp_offs (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                emp_name VARCHAR(255) NOT NULL,
                emp_email VARCHAR(255) NOT NULL,
                work_date DATE NOT NULL,
                clock_in_time TIMESTAMP NOT NULL,
                clock_out_time TIMESTAMP,
                working_hours NUMERIC(4,2),
                comp_off_earned NUMERIC(2,1),
                comp_off_used NUMERIC(2,1) DEFAULT 0,
                comp_off_balance NUMERIC(2,1),
                validated_by VARCHAR(50),
                validated_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (status IN ('pending', 'validated', 'approved', 'rejected'))
            )
        """)
        logger.info("✓ Comp-offs table created")
        
        # ==================== STEP 3: ADD FOREIGN KEYS (SAFELY) ====================
        
        # Add FK to users table
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'users_emp_code_fkey'
                ) THEN
                    ALTER TABLE users 
                    ADD CONSTRAINT users_emp_code_fkey 
                    FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        logger.info("✓ Users FK added")
        
        # Add FK to otp_codes table
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'otp_codes_emp_code_fkey'
                ) THEN
                    ALTER TABLE otp_codes 
                    ADD CONSTRAINT otp_codes_emp_code_fkey 
                    FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        logger.info("✓ OTP codes FK added")
        
        # Add FK to leaves table
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'leaves_emp_code_fkey'
                ) THEN
                    ALTER TABLE leaves 
                    ADD CONSTRAINT leaves_emp_code_fkey 
                    FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        logger.info("✓ Leaves FK added")
        
        # Add FK to comp_offs table
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'comp_offs_emp_code_fkey'
                ) THEN
                    ALTER TABLE comp_offs 
                    ADD CONSTRAINT comp_offs_emp_code_fkey 
                    FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        logger.info("✓ Comp-offs FK added")
        
        # ==================== STEP 4: CREATE INDEXES ====================
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_holidays_date ON organization_holidays(holiday_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_emp_code ON otp_codes(emp_code, used, expires_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaves_emp_code ON leaves(emp_code, status, from_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaves_manager ON leaves(manager_code, status, applied_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_comp_offs_emp_code ON comp_offs(emp_code, status, work_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_email_date ON attendance(employee_email, date, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_email_date ON activities(employee_email, date, activity_type, status)")
        
        logger.info("✓ Indexes created")
        
        conn.commit()
        
        logger.info("=" * 70)
        logger.info("✓ Database initialization successful!")
        logger.info("=" * 70)
        
    except Exception as e:
        conn.rollback()
        logger.error(f"✗ Error initializing database: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise
    finally:
        cursor.close()
        conn.close()


class DatabaseConnection:
    """Context manager for database connections"""
    
    def __init__(self):
        self.conn = None
        self.cursor = None
    
    def __enter__(self):
        self.conn = get_db_connection()
        self.cursor = self.conn.cursor()
        return self.cursor
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
            logger.error(f"Database error: {exc_val}")
        else:
            self.conn.commit()
        
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        
        return False


def execute_query(query: str, params: tuple = None, fetch_one: bool = False):
    """Execute a database query"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, params)
        
        if query.strip().upper().startswith('SELECT'):
            result = cursor.fetchone() if fetch_one else cursor.fetchall()
        else:
            conn.commit()
            result = cursor.rowcount
        
        return result
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Query execution error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()