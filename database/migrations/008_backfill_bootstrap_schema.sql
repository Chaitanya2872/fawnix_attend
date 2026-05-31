-- Move legacy inline schema updates out of init_database().
-- This migration upgrades existing databases to the bootstrap schema shape.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_holidays' AND column_name = 'holiday_type'
    ) THEN
        ALTER TABLE organization_holidays ADD COLUMN holiday_type VARCHAR(40);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_holidays' AND column_name = 'description'
    ) THEN
        ALTER TABLE organization_holidays ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_holidays' AND column_name = 'status'
    ) THEN
        ALTER TABLE organization_holidays ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organization_holidays' AND column_name = 'created_by_emp_code'
    ) THEN
        ALTER TABLE organization_holidays ADD COLUMN created_by_emp_code VARCHAR(50);
    END IF;
END $$;

UPDATE organization_holidays
SET holiday_type = CASE
    WHEN COALESCE(is_mandatory, true) THEN 'Public Holiday'
    ELSE 'Optional Holiday'
END
WHERE holiday_type IS NULL OR TRIM(holiday_type) = '';

UPDATE organization_holidays
SET status = 'Active'
WHERE status IS NULL OR TRIM(status) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'emp_shift_id'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN emp_shift_id INTEGER REFERENCES shifts(shift_id) DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'emp_joining_date'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN emp_joining_date DATE DEFAULT '2024-01-01';
    END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS users_id_seq;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
    ) THEN
        ALTER TABLE users ADD COLUMN id BIGINT;
    END IF;
END $$;

ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
UPDATE users SET id = nextval('users_id_seq') WHERE id IS NULL;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER SEQUENCE users_id_seq OWNED BY users.id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id ON users(id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_emp_code_fkey' AND table_name = 'users'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'admin_permissions_emp_code_fkey' AND table_name = 'admin_permissions'
    ) THEN
        ALTER TABLE admin_permissions
        ADD CONSTRAINT admin_permissions_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'otp_codes_emp_code_fkey' AND table_name = 'otp_codes'
    ) THEN
        ALTER TABLE otp_codes
        ADD CONSTRAINT otp_codes_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance' AND column_name = 'auto_clocked_out'
    ) THEN
        ALTER TABLE attendance ADD COLUMN auto_clocked_out BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance' AND column_name = 'auto_clockout_reason'
    ) THEN
        ALTER TABLE attendance ADD COLUMN auto_clockout_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leaves_emp_code_fkey' AND table_name = 'leaves'
    ) THEN
        ALTER TABLE leaves
        ADD CONSTRAINT leaves_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'comp_offs_emp_code_fkey' AND table_name = 'comp_offs'
    ) THEN
        ALTER TABLE comp_offs
        ADD CONSTRAINT comp_offs_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leads_created_by_emp_code_fkey' AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_created_by_emp_code_fkey
        FOREIGN KEY (created_by_emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leads_assigned_to_emp_code_fkey' AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_assigned_to_emp_code_fkey
        FOREIGN KEY (assigned_to_emp_code) REFERENCES employees(emp_code) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_devices' AND column_name = 'emp_code'
    ) THEN
        ALTER TABLE user_devices ADD COLUMN emp_code VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_devices_emp_code_fkey' AND table_name = 'user_devices'
    ) THEN
        ALTER TABLE user_devices
        ADD CONSTRAINT user_devices_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'attendance_tracking_notification_state_attendance_fkey'
          AND table_name = 'attendance_tracking_notification_state'
    ) THEN
        ALTER TABLE attendance_tracking_notification_state
        ADD CONSTRAINT attendance_tracking_notification_state_attendance_fkey
        FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'attendance_tracking_notification_state_emp_code_fkey'
          AND table_name = 'attendance_tracking_notification_state'
    ) THEN
        ALTER TABLE attendance_tracking_notification_state
        ADD CONSTRAINT attendance_tracking_notification_state_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'scheduled_notifications_created_by_emp_code_fkey'
          AND table_name = 'scheduled_notifications'
    ) THEN
        ALTER TABLE scheduled_notifications
        ADD CONSTRAINT scheduled_notifications_created_by_emp_code_fkey
        FOREIGN KEY (created_by_emp_code) REFERENCES employees(emp_code) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scheduled_notification_logs'
          AND column_name = 'schedule_id'
    ) THEN
        ALTER TABLE scheduled_notification_logs ADD COLUMN schedule_id BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'scheduled_notification_logs_schedule_id_fkey'
          AND table_name = 'scheduled_notification_logs'
    ) THEN
        ALTER TABLE scheduled_notification_logs
        ADD CONSTRAINT scheduled_notification_logs_schedule_id_fkey
        FOREIGN KEY (schedule_id) REFERENCES scheduled_notifications(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'scheduled_notification_logs_emp_code_fkey'
          AND table_name = 'scheduled_notification_logs'
    ) THEN
        ALTER TABLE scheduled_notification_logs
        ADD CONSTRAINT scheduled_notification_logs_emp_code_fkey
        FOREIGN KEY (emp_code) REFERENCES employees(emp_code) ON DELETE SET NULL;
    END IF;
END $$;
