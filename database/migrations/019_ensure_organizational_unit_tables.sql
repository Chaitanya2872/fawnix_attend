CREATE TABLE IF NOT EXISTS working_units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(50),
    unit_name VARCHAR(150),
    address TEXT,
    city VARCHAR(120),
    state VARCHAR(120),
    country VARCHAR(120),
    pincode VARCHAR(20),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geofence_radius NUMERIC(10, 2),
    branch_site_name VARCHAR(150),
    shift_mapping_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by VARCHAR(150),
    created_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(50),
    unit_name VARCHAR(150),
    legal_entity_name VARCHAR(200),
    pay_group_id BIGINT,
    pan_tax_id VARCHAR(40),
    gst_registration_no VARCHAR(40),
    pf_registration_no VARCHAR(60),
    esi_registration_no VARCHAR(60),
    bank_name VARCHAR(150),
    bank_account_no VARCHAR(60),
    ifsc_swift_code VARCHAR(40),
    payslip_template_id BIGINT,
    pay_cycle VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by VARCHAR(150),
    created_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_date DATE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

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
    ADD COLUMN IF NOT EXISTS pay_cycle VARCHAR(80),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_date DATE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_code'
    ) THEN
        EXECUTE $sql$UPDATE working_units SET unit_code = COALESCE(NULLIF(unit_code, ''), working_unit_code) WHERE unit_code IS NULL OR unit_code = ''$sql$;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'working_units'
          AND column_name = 'working_unit_name'
    ) THEN
        EXECUTE $sql$UPDATE working_units SET unit_name = COALESCE(NULLIF(unit_name, ''), working_unit_name) WHERE unit_name IS NULL OR unit_name = ''$sql$;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_code'
    ) THEN
        EXECUTE $sql$UPDATE payroll_units SET unit_code = COALESCE(NULLIF(unit_code, ''), payroll_unit_code) WHERE unit_code IS NULL OR unit_code = ''$sql$;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_units'
          AND column_name = 'payroll_unit_name'
    ) THEN
        EXECUTE $sql$UPDATE payroll_units SET unit_name = COALESCE(NULLIF(unit_name, ''), payroll_unit_name) WHERE unit_name IS NULL OR unit_name = ''$sql$;
    END IF;
END $$;

UPDATE working_units
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE payroll_units
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE working_units
SET created_date = COALESCE(created_date, created_at::date, CURRENT_DATE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

UPDATE payroll_units
SET created_date = COALESCE(created_date, created_at::date, CURRENT_DATE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

ALTER TABLE working_units
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN created_date SET DEFAULT CURRENT_DATE,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE payroll_units
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN created_date SET DEFAULT CURRENT_DATE,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

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
