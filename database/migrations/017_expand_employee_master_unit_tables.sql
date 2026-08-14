DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'unit_code'
    ) THEN
        ALTER TABLE working_units RENAME COLUMN working_unit_code TO unit_code;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'unit_name'
    ) THEN
        ALTER TABLE working_units RENAME COLUMN working_unit_name TO unit_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'unit_code'
    ) THEN
        ALTER TABLE payroll_units RENAME COLUMN payroll_unit_code TO unit_code;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'unit_name'
    ) THEN
        ALTER TABLE payroll_units RENAME COLUMN payroll_unit_name TO unit_name;
    END IF;
END $$;

ALTER TABLE working_units
    ADD COLUMN IF NOT EXISTS unit_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS unit_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS state VARCHAR(120),
    ADD COLUMN IF NOT EXISTS country VARCHAR(120),
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS geofence_radius NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS branch_site_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS shift_mapping_id BIGINT,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_date DATE;

ALTER TABLE payroll_units
    ADD COLUMN IF NOT EXISTS unit_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS unit_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS legal_entity_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS pay_group_id BIGINT,
    ADD COLUMN IF NOT EXISTS pan_tax_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS gst_registration_no VARCHAR(40),
    ADD COLUMN IF NOT EXISTS pf_registration_no VARCHAR(60),
    ADD COLUMN IF NOT EXISTS esi_registration_no VARCHAR(60),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(60),
    ADD COLUMN IF NOT EXISTS ifsc_swift_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS payslip_template_id BIGINT,
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_date DATE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_code'
    ) THEN
        EXECUTE $sql$UPDATE working_units SET unit_code = COALESCE(NULLIF(unit_code, ''), working_unit_code) WHERE unit_code IS NULL OR unit_code = ''$sql$;
        EXECUTE 'ALTER TABLE working_units ALTER COLUMN working_unit_code DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_name'
    ) THEN
        EXECUTE $sql$UPDATE working_units SET unit_name = COALESCE(NULLIF(unit_name, ''), working_unit_name) WHERE unit_name IS NULL OR unit_name = ''$sql$;
        EXECUTE 'ALTER TABLE working_units ALTER COLUMN working_unit_name DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'unit_head_manager'
    ) THEN
        EXECUTE 'ALTER TABLE working_units ALTER COLUMN unit_head_manager DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'location'
    ) THEN
        EXECUTE 'ALTER TABLE working_units ALTER COLUMN location DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'created_at'
    ) THEN
        EXECUTE 'UPDATE working_units SET created_date = created_at::date WHERE created_date IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_code'
    ) THEN
        EXECUTE $sql$UPDATE payroll_units SET unit_code = COALESCE(NULLIF(unit_code, ''), payroll_unit_code) WHERE unit_code IS NULL OR unit_code = ''$sql$;
        EXECUTE 'ALTER TABLE payroll_units ALTER COLUMN payroll_unit_code DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_name'
    ) THEN
        EXECUTE $sql$UPDATE payroll_units SET unit_name = COALESCE(NULLIF(unit_name, ''), payroll_unit_name) WHERE unit_name IS NULL OR unit_name = ''$sql$;
        EXECUTE 'ALTER TABLE payroll_units ALTER COLUMN payroll_unit_name DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_manager'
    ) THEN
        EXECUTE 'ALTER TABLE payroll_units ALTER COLUMN payroll_manager DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'location'
    ) THEN
        EXECUTE 'ALTER TABLE payroll_units ALTER COLUMN location DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'pay_cycle'
    ) THEN
        EXECUTE 'ALTER TABLE payroll_units ALTER COLUMN pay_cycle DROP NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'created_at'
    ) THEN
        EXECUTE 'UPDATE payroll_units SET created_date = created_at::date WHERE created_date IS NULL';
    END IF;
END $$;

ALTER TABLE working_units
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN created_date SET DEFAULT CURRENT_DATE;

ALTER TABLE payroll_units
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN created_date SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_working_units_unit_code_lookup
    ON working_units (LOWER(unit_code))
    WHERE unit_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_working_units_unit_table_search
    ON working_units (unit_code, unit_name, city, state, country);

CREATE INDEX IF NOT EXISTS idx_payroll_units_unit_code_lookup
    ON payroll_units (LOWER(unit_code))
    WHERE unit_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_units_unit_table_search
    ON payroll_units (unit_code, unit_name, legal_entity_name, pay_cycle);
