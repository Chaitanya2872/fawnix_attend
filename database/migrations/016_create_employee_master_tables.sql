CREATE TABLE IF NOT EXISTS working_units (
    id SERIAL PRIMARY KEY,
    working_unit_code VARCHAR(50) NOT NULL UNIQUE,
    working_unit_name VARCHAR(150) NOT NULL,
    description TEXT,
    unit_head_manager VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_working_units_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS payroll_units (
    id SERIAL PRIMARY KEY,
    payroll_unit_code VARCHAR(50) NOT NULL UNIQUE,
    payroll_unit_name VARCHAR(150) NOT NULL,
    description TEXT,
    payroll_manager VARCHAR(150) NOT NULL,
    pay_cycle VARCHAR(80) NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payroll_units_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    designation_code VARCHAR(50) NOT NULL UNIQUE,
    designation_name VARCHAR(150) NOT NULL,
    description TEXT,
    job_level_grade VARCHAR(80) NOT NULL,
    department VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_designations_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    department_code VARCHAR(50) NOT NULL UNIQUE,
    department_name VARCHAR(150) NOT NULL,
    description TEXT,
    department_head VARCHAR(150) NOT NULL,
    parent_department VARCHAR(150),
    working_unit VARCHAR(150) NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_departments_status CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX IF NOT EXISTS idx_working_units_status ON working_units(status);
CREATE INDEX IF NOT EXISTS idx_working_units_search ON working_units(working_unit_code, working_unit_name, location);

CREATE INDEX IF NOT EXISTS idx_payroll_units_status ON payroll_units(status);
CREATE INDEX IF NOT EXISTS idx_payroll_units_search ON payroll_units(payroll_unit_code, payroll_unit_name, pay_cycle, location);

CREATE INDEX IF NOT EXISTS idx_designations_status ON designations(status);
CREATE INDEX IF NOT EXISTS idx_designations_search ON designations(designation_code, designation_name, department);

CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_search ON departments(department_code, department_name, working_unit, location);
