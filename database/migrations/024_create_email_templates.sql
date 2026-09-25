CREATE TABLE IF NOT EXISTS email_templates (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(150) NOT NULL UNIQUE,
    template_name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (html_body IS NOT NULL OR text_body IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS email_delivery_audit (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(150),
    source_service VARCHAR(150),
    reference_id VARCHAR(255),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    cc_count INTEGER NOT NULL DEFAULT 0,
    bcc_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP,
    failure_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_audit_created_at
    ON email_delivery_audit (created_at DESC);
