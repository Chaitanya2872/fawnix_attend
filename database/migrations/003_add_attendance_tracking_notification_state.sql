BEGIN;

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
);

DO $$
BEGIN
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
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_tracking_notification_state_emp_status
ON attendance_tracking_notification_state(emp_code, current_status);

COMMIT;
