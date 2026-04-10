BEGIN;

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
);

DO $$
BEGIN
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
END $$;

DO $$
BEGIN
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
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_schedule
ON scheduled_notifications(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_creator_created
ON scheduled_notifications(created_by_emp_code, created_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_schedule_id
ON scheduled_notification_logs(schedule_id, created_at);

COMMIT;
