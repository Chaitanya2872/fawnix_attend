CREATE TABLE IF NOT EXISTS database_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id TEXT,
    changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_database_audit_logs_changed_at
    ON database_audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_database_audit_logs_table_name
    ON database_audit_logs (table_name, changed_at DESC);

CREATE OR REPLACE FUNCTION audit_public_table_change()
RETURNS TRIGGER AS $$
DECLARE
    old_json JSONB;
    new_json JSONB;
    safe_old JSONB;
    safe_new JSONB;
    changed JSONB;
    row_identity TEXT;
    actor TEXT;
BEGIN
    old_json := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
    new_json := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

    -- Never persist authentication secrets in audit history.
    safe_old := old_json - ARRAY[
        'password', 'password_hash', 'otp', 'otp_code', 'access_token',
        'refresh_token', 'token', 'secret', 'api_key'
    ];
    safe_new := new_json - ARRAY[
        'password', 'password_hash', 'otp', 'otp_code', 'access_token',
        'refresh_token', 'token', 'secret', 'api_key'
    ];

    IF TG_OP = 'UPDATE' THEN
        SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
        INTO changed
        FROM jsonb_object_keys(COALESCE(safe_old, '{}'::jsonb) || COALESCE(safe_new, '{}'::jsonb)) AS key
        WHERE safe_old -> key IS DISTINCT FROM safe_new -> key;

        IF changed = '[]'::jsonb THEN
            RETURN NEW;
        END IF;
    ELSE
        changed := COALESCE(
            (SELECT jsonb_agg(key ORDER BY key) FROM jsonb_object_keys(COALESCE(safe_new, safe_old, '{}'::jsonb)) AS key),
            '[]'::jsonb
        );
    END IF;

    row_identity := COALESCE(
        new_json ->> 'id', old_json ->> 'id',
        new_json ->> 'emp_code', old_json ->> 'emp_code',
        new_json ->> 'code', old_json ->> 'code',
        new_json ->> 'email', old_json ->> 'email'
    );
    actor := COALESCE(NULLIF(current_setting('app.current_emp_code', true), ''), session_user);

    INSERT INTO database_audit_logs
        (table_name, operation, record_id, changed_fields, old_data, new_data, changed_by)
    VALUES
        (TG_TABLE_NAME, TG_OP, row_identity, changed, safe_old, safe_new, actor);

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    target RECORD;
BEGIN
    FOR target IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('database_audit_logs', 'employee_audit_logs')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_row_changes ON public.%I', target.tablename);
        EXECUTE format(
            'CREATE TRIGGER audit_row_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I '
            'FOR EACH ROW EXECUTE FUNCTION audit_public_table_change()',
            target.tablename
        );
    END LOOP;
END $$;
