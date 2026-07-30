DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'compoff_requests'
    ) THEN
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS consumed_days NUMERIC(3,1) NOT NULL DEFAULT 0;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS available_days NUMERIC(3,1) NOT NULL DEFAULT 0;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS available_at TIMESTAMP;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;
        ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP;

        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_compoff_status'
              AND conrelid = 'compoff_requests'::regclass
        ) THEN
            ALTER TABLE compoff_requests
            DROP CONSTRAINT chk_compoff_status;
        END IF;

        UPDATE compoff_requests
        SET
            status = 'available',
            available_at = COALESCE(available_at, approved_at, NOW()),
            available_days = CASE
                WHEN COALESCE(available_days, 0) = 0
                    THEN GREATEST(COALESCE(total_comp_days, 0) - COALESCE(consumed_days, 0), 0)
                ELSE available_days
            END,
            updated_at = NOW()
        WHERE status = 'approved';

        ALTER TABLE compoff_requests
        ADD CONSTRAINT chk_compoff_status
        CHECK (
            status IN (
                'pending',
                'rejected',
                'cancelled',
                'available',
                'partially_consumed',
                'consumed',
                'expired'
            )
        );
    END IF;
END $$;
