"""
Database connection, bootstrap, and migration management.
"""

from contextlib import contextmanager
from pathlib import Path
import logging

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from config import Config

logger = logging.getLogger(__name__)

connection_pool = None
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def _print_db_login_config():
    """Debug print for DB login config values."""
    print("DB_HOST =", Config.DATABASE_HOST)
    print("DB_PORT =", Config.DATABASE_PORT)
    print("DB_NAME =", Config.DATABASE_NAME)
    print("DB_USER =", Config.DATABASE_USER)
    print("DB_PASSWORD_LENGTH =", len(Config.DATABASE_PASSWORD or ""))


def initialize_connection_pool(min_conn=2, max_conn=10):
    """Initialize PostgreSQL connection pool."""
    global connection_pool

    try:
        _print_db_login_config()
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            min_conn,
            max_conn,
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            database=Config.DATABASE_NAME,
            user=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            cursor_factory=RealDictCursor,
        )

        if connection_pool:
            logger.info("Connection pool created (min=%s, max=%s)", min_conn, max_conn)
            return True

        logger.error("Failed to create connection pool")
        return False
    except Exception as exc:
        logger.error("Error creating connection pool: %s", exc)
        return False


def close_connection_pool():
    """Close all connections in the pool."""
    global connection_pool

    if connection_pool:
        connection_pool.closeall()
        logger.info("Connection pool closed")


def get_db_connection():
    """Get a database connection from the pool or create one directly."""
    try:
        _print_db_login_config()
        if connection_pool:
            conn = connection_pool.getconn()
            if conn:
                return conn

        return psycopg2.connect(
            host=Config.DATABASE_HOST,
            port=Config.DATABASE_PORT,
            database=Config.DATABASE_NAME,
            user=Config.DATABASE_USER,
            password=Config.DATABASE_PASSWORD,
            cursor_factory=RealDictCursor,
        )
    except Exception as exc:
        logger.error("Database connection error: %s", exc)
        raise


def return_connection(conn):
    """Return a connection to the pool."""
    if connection_pool and conn:
        connection_pool.putconn(conn)
    elif conn:
        conn.close()


@contextmanager
def get_db_cursor():
    """Context manager for database operations."""
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.error("Database operation error: %s", exc)
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            return_connection(conn)


def _ensure_schema_migrations_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename VARCHAR(255) PRIMARY KEY,
            executed_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)


def _normalize_migration_sql(sql_text: str) -> str:
    """Strip top-level transaction control statements from migration SQL.

    Only matches the semicolon-terminated forms (e.g. "BEGIN;") so that bare
    "BEGIN"/"END" keywords inside PL/pgSQL blocks (DO $$ BEGIN ... END $$;)
    are left untouched.
    """
    normalized_lines = []
    for line in sql_text.splitlines():
        stripped = line.strip().upper()
        if stripped in {"BEGIN;", "COMMIT;", "ROLLBACK;"}:
            continue
        normalized_lines.append(line)
    return "\n".join(normalized_lines).strip()


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = %s
        LIMIT 1
        """,
        (table_name,),
    )
    return cursor.fetchone() is not None


def _should_baseline_legacy_migrations(cursor) -> bool:
    """
    Detect an existing pre-migration-runner database.

    Fresh bootstrap databases created by this repo do not create these tables,
    but long-running deployed databases already have them. When that state is
    present and schema_migrations is empty, replaying old migrations is risky.
    """
    legacy_tables = (
        "attendance_exceptions",
        "field_visits",
        "location_tracking",
        "field_visit_tracking",
        "overtime_records",
    )
    return any(_table_exists(cursor, table_name) for table_name in legacy_tables)


def _baseline_existing_migrations(cursor):
    migration_files = sorted(path for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file())
    for migration_path in migration_files:
        cursor.execute(
            """
            INSERT INTO schema_migrations (filename)
            VALUES (%s)
            ON CONFLICT (filename) DO NOTHING
            """,
            (migration_path.name,),
        )
    return len(migration_files)


def run_migrations():
    """Execute pending SQL migration files in sorted order."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        _ensure_schema_migrations_table(cursor)
        conn.commit()

        cursor.execute("SELECT filename FROM schema_migrations")
        executed = {row["filename"] for row in cursor.fetchall()}
        if not executed and _should_baseline_legacy_migrations(cursor):
            baseline_count = _baseline_existing_migrations(cursor)
            conn.commit()
            logger.info(
                "Detected legacy database without migration tracking; baselined %s migration(s)",
                baseline_count,
            )
            executed = {path.name for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file()}
        migration_files = sorted(path for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file())
        pending = [path for path in migration_files if path.name not in executed]

        if not pending:
            logger.info("No pending database migrations")
            return

        logger.info("Running %s pending database migration(s)...", len(pending))
    finally:
        cursor.close()
        return_connection(conn)

    for migration_path in pending:
        migration_conn = get_db_connection()
        migration_cursor = migration_conn.cursor()
        try:
            logger.info("Running migration: %s", migration_path.name)
            _ensure_schema_migrations_table(migration_cursor)
            sql_text = _normalize_migration_sql(migration_path.read_text(encoding="utf-8"))
            if sql_text:
                migration_cursor.execute(sql_text)
            migration_cursor.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)",
                (migration_path.name,),
            )
            migration_conn.commit()
            logger.info("Migration succeeded: %s", migration_path.name)
        except Exception as exc:
            migration_conn.rollback()
            logger.error("Migration failed: %s", migration_path.name)
            logger.error("Migration error: %s", exc)
            raise RuntimeError(f"Database migration failed: {migration_path.name}") from exc
        finally:
            migration_cursor.close()
            return_connection(migration_conn)


def init_database():
    """
    Initialize bootstrap tables for first-time setup only.

    Schema evolution for existing deployments must go through
    versioned SQL files under database/migrations/.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        logger.info("Initializing bootstrap database tables...")

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

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organization_holidays (
                id SERIAL PRIMARY KEY,
                holiday_date DATE NOT NULL UNIQUE,
                holiday_name VARCHAR(255) NOT NULL,
                is_mandatory BOOLEAN DEFAULT true,
                holiday_type VARCHAR(40),
                description TEXT,
                status VARCHAR(20) DEFAULT 'Active',
                created_by_emp_code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL UNIQUE,
                emp_code VARCHAR(50) PRIMARY KEY,
                role VARCHAR(20) DEFAULT 'employee',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_permissions (
                emp_code VARCHAR(50) PRIMARY KEY,
                can_read BOOLEAN DEFAULT true,
                can_write BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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
                attendance_type VARCHAR(20) NOT NULL DEFAULT 'office',
                auto_clocked_out BOOLEAN DEFAULT false,
                auto_clockout_reason TEXT,
                alert_sent BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                lead_name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                phone_number VARCHAR(30),
                email VARCHAR(255),
                source VARCHAR(100),
                status VARCHAR(30) DEFAULT 'new',
                priority VARCHAR(20) DEFAULT 'medium',
                location TEXT,
                expected_value NUMERIC(12,2),
                follow_up_date DATE,
                notes TEXT,
                field_visit_id INTEGER,
                assigned_to_emp_code VARCHAR(50),
                assigned_to_email VARCHAR(255),
                created_by_emp_code VARCHAR(50) NOT NULL,
                created_by_email VARCHAR(255),
                created_by_name VARCHAR(255),
                last_contacted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
                CHECK (priority IN ('low', 'medium', 'high'))
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_devices (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                emp_code VARCHAR(50),
                fcm_token TEXT NOT NULL UNIQUE,
                platform VARCHAR(20) NOT NULL DEFAULT 'android',
                device_name VARCHAR(100),
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance_away_alerts (
                user_id BIGINT PRIMARY KEY,
                last_sent_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meeting_notes_records (
                meeting_note_id VARCHAR(64) PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                meeting_title VARCHAR(255),
                language VARCHAR(32),
                file_name VARCHAR(255) NOT NULL,
                content_type VARCHAR(100),
                provider VARCHAR(20),
                status VARCHAR(30) NOT NULL DEFAULT 'uploaded',
                audio_bucket VARCHAR(255),
                audio_object_name VARCHAR(500),
                audio_url TEXT,
                audio_folder VARCHAR(255),
                audio_size_bytes BIGINT,
                transcript TEXT,
                summary TEXT,
                minutes_of_meeting TEXT,
                important_points_json TEXT,
                report_bucket VARCHAR(255),
                report_object_name VARCHAR(500),
                report_url TEXT,
                report_download_url TEXT,
                report_file_name VARCHAR(255),
                report_content_type VARCHAR(100),
                report_size_bytes BIGINT,
                generated_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance_tracking_notification_state (
                attendance_id BIGINT PRIMARY KEY,
                emp_code VARCHAR(50),
                current_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
                started_notified_at TIMESTAMP NULL,
                paused_notified_at TIMESTAMP NULL,
                resumed_notified_at TIMESTAMP NULL,
                stopped_notified_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_notifications (
                id BIGSERIAL PRIMARY KEY,
                notification_type VARCHAR(50) NOT NULL DEFAULT 'custom_scheduled',
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                scheduled_for TIMESTAMP NOT NULL,
                created_by_emp_code VARCHAR(50),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                processed_at TIMESTAMP NULL,
                total_candidates INTEGER NOT NULL DEFAULT 0,
                sent_count INTEGER NOT NULL DEFAULT 0,
                failed_count INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CHECK (status IN ('pending', 'processing', 'sent', 'partial', 'failed', 'skipped', 'cancelled'))
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_notification_logs (
                id BIGSERIAL PRIMARY KEY,
                schedule_id BIGINT,
                notification_type VARCHAR(50) NOT NULL,
                emp_code VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                scheduled_for TIMESTAMP NULL,
                delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                sent_at TIMESTAMP NULL,
                failure_message TEXT,
                response_payload JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_holidays_date ON organization_holidays(holiday_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_emp_code ON otp_codes(emp_code, used, expires_at)")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id ON users(id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_admin_permissions_rw ON admin_permissions(can_read, can_write)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaves_emp_code ON leaves(emp_code, status, from_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leaves_manager ON leaves(manager_code, status, applied_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_comp_offs_emp_code ON comp_offs(emp_code, status, work_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_email_date ON attendance(employee_email, date, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_email_date ON activities(employee_email, date, activity_type, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(created_by_emp_code, assigned_to_emp_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_status_priority ON leads(status, priority, updated_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leads_field_visit ON leads(field_visit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_devices_user_active ON user_devices(user_id, is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_devices_emp_code_active ON user_devices(emp_code, is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attendance_away_alerts_last_sent ON attendance_away_alerts(last_sent_at)")
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_attendance_tracking_notification_state_emp_status "
            "ON attendance_tracking_notification_state(emp_code, current_status)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_schedule "
            "ON scheduled_notifications(status, scheduled_for)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_creator_created "
            "ON scheduled_notifications(created_by_emp_code, created_at)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_type_schedule "
            "ON scheduled_notification_logs(notification_type, scheduled_for)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_emp_created "
            "ON scheduled_notification_logs(emp_code, created_at)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_schedule_id "
            "ON scheduled_notification_logs(schedule_id, created_at)"
        )

        conn.commit()
        logger.info("Bootstrap database tables initialized successfully")
    except Exception as exc:
        conn.rollback()
        logger.error("Error initializing database: %s", exc)
        raise
    finally:
        cursor.close()
        return_connection(conn)


class DatabaseConnection:
    """Context manager for database connections."""

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
            logger.error("Database error: %s", exc_val)
        else:
            self.conn.commit()

        if self.cursor:
            self.cursor.close()
        if self.conn:
            return_connection(self.conn)

        return False


def execute_query(query: str, params: tuple = None, fetch_one: bool = False):
    """Execute a database query and return the result."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(query, params)

        if query.strip().upper().startswith("SELECT"):
            result = cursor.fetchone() if fetch_one else cursor.fetchall()
        else:
            conn.commit()
            result = cursor.rowcount

        return result
    except Exception as exc:
        conn.rollback()
        logger.error("Query execution error: %s", exc)
        raise
    finally:
        cursor.close()
        return_connection(conn)
