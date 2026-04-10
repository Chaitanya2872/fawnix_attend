BEGIN;

CREATE TABLE IF NOT EXISTS scheduled_notification_logs (
    id BIGSERIAL PRIMARY KEY,
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
);

DO $$
BEGIN
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

CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_type_schedule
ON scheduled_notification_logs(notification_type, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_scheduled_notification_logs_emp_created
ON scheduled_notification_logs(emp_code, created_at);

COMMIT;
