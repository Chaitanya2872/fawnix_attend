-- Service accounts: API-only identities for integrating external systems.
-- They never log in (no OTP, no refresh tokens) and authenticate with a
-- long-lived API key of the form fxsa_<key_id>_<secret>. Only a SHA-256 hash of
-- the key is stored.

CREATE TABLE IF NOT EXISTS service_accounts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    key_id TEXT UNIQUE,
    key_hash TEXT,
    can_read BOOLEAN NOT NULL DEFAULT FALSE,
    can_write BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    key_rotated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by TEXT,
    revoke_reason TEXT,
    last_used_at TIMESTAMPTZ,
    last_used_ip TEXT,
    CONSTRAINT service_accounts_status_check CHECK (status IN ('active', 'revoked')),
    CONSTRAINT service_accounts_permission_check CHECK (can_read OR can_write OR can_update)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_accounts_name_lower
    ON service_accounts (lower(name));

CREATE TABLE IF NOT EXISTS service_account_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    service_account_id BIGINT REFERENCES service_accounts(id),
    event TEXT NOT NULL,
    actor TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_account_audit_logs_account
    ON service_account_audit_logs (service_account_id, created_at DESC);

-- These tables keep their own audit trail. Make sure the generic row trigger
-- from 017 is never attached, so key_hash can't end up in database_audit_logs.
DROP TRIGGER IF EXISTS audit_row_changes ON service_accounts;
DROP TRIGGER IF EXISTS audit_row_changes ON service_account_audit_logs;
