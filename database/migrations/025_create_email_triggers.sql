-- Email triggers bind a template to a way of firing it:
--   manual   : only sent when an admin clicks "Run" (or calls the run API)
--   event    : sent automatically when the application emits event_name (e.g. leave.applied)
--   schedule : sent automatically on a 5-field cron expression (schedule_cron)
-- Recipient entries may contain {{placeholders}} that resolve from the event context,
-- e.g. "{{employee_email}}" or "{{manager_email}}".
CREATE TABLE IF NOT EXISTS email_triggers (
    id BIGSERIAL PRIMARY KEY,
    trigger_key VARCHAR(150) NOT NULL UNIQUE,
    trigger_name VARCHAR(255) NOT NULL,
    template_key VARCHAR(150) NOT NULL REFERENCES email_templates (template_key),
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('manual', 'event', 'schedule')),
    event_name VARCHAR(150),
    schedule_cron VARCHAR(100),
    to_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    cc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    bcc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    last_status VARCHAR(20),
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (trigger_type <> 'event' OR event_name IS NOT NULL),
    CHECK (trigger_type <> 'schedule' OR schedule_cron IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_email_triggers_event
    ON email_triggers (event_name) WHERE active AND trigger_type = 'event';

CREATE INDEX IF NOT EXISTS idx_email_triggers_next_run
    ON email_triggers (next_run_at) WHERE active AND trigger_type = 'schedule';

ALTER TABLE email_delivery_audit ADD COLUMN IF NOT EXISTS provider VARCHAR(20);
ALTER TABLE email_delivery_audit ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);
