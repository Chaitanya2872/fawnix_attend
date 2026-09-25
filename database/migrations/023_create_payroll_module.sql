CREATE TABLE IF NOT EXISTS payroll_header_columns (
    id BIGSERIAL PRIMARY KEY,
    column_key VARCHAR(80) NOT NULL UNIQUE,
    column_label VARCHAR(150) NOT NULL,
    source_field VARCHAR(120),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS payroll_components (
    id BIGSERIAL PRIMARY KEY,
    component_code VARCHAR(80) NOT NULL UNIQUE,
    component_name VARCHAR(150) NOT NULL,
    component_type VARCHAR(40) NOT NULL,
    calculation_type VARCHAR(40) NOT NULL DEFAULT 'fixed',
    base_component_code VARCHAR(80),
    rate_percent NUMERIC(9,4),
    monthly_amount NUMERIC(14,2),
    annual_amount NUMERIC(14,2),
    cap_amount NUMERIC(14,2),
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    affects_gross BOOLEAN NOT NULL DEFAULT FALSE,
    affects_net BOOLEAN NOT NULL DEFAULT TRUE,
    affects_ctc BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (component_type IN ('earning', 'employee_deduction', 'employer_contribution', 'informational')),
    CHECK (calculation_type IN ('fixed', 'percentage', 'formula')),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS payroll_salary_structures (
    id BIGSERIAL PRIMARY KEY,
    structure_code VARCHAR(80) NOT NULL UNIQUE,
    structure_name VARCHAR(150) NOT NULL,
    payroll_unit_id BIGINT REFERENCES payroll_units(id) ON DELETE SET NULL,
    offer_type VARCHAR(80),
    gross_monthly NUMERIC(14,2),
    ctc_monthly NUMERIC(14,2),
    effective_from DATE,
    effective_to DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS payroll_salary_structure_components (
    id BIGSERIAL PRIMARY KEY,
    structure_id BIGINT NOT NULL REFERENCES payroll_salary_structures(id) ON DELETE CASCADE,
    component_id BIGINT REFERENCES payroll_components(id) ON DELETE SET NULL,
    component_code VARCHAR(80) NOT NULL,
    component_name VARCHAR(150) NOT NULL,
    component_type VARCHAR(40) NOT NULL,
    calculation_type VARCHAR(40) NOT NULL DEFAULT 'fixed',
    base_component_code VARCHAR(80),
    rate_percent NUMERIC(9,4),
    monthly_amount NUMERIC(14,2),
    annual_amount NUMERIC(14,2),
    cap_amount NUMERIC(14,2),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (structure_id, component_code),
    CHECK (component_type IN ('earning', 'employee_deduction', 'employer_contribution', 'informational')),
    CHECK (calculation_type IN ('fixed', 'percentage', 'formula'))
);

CREATE TABLE IF NOT EXISTS employee_salary_assignments (
    id BIGSERIAL PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL REFERENCES employees(emp_code) ON DELETE CASCADE,
    emp_email VARCHAR(255),
    structure_id BIGINT REFERENCES payroll_salary_structures(id) ON DELETE SET NULL,
    payroll_unit_id BIGINT REFERENCES payroll_units(id) ON DELETE SET NULL,
    offer_type VARCHAR(80),
    offered_ctc NUMERIC(14,2),
    offered_gross_pay NUMERIC(14,2),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (status IN ('draft', 'active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id BIGSERIAL PRIMARY KEY,
    run_code VARCHAR(90) NOT NULL UNIQUE,
    run_name VARCHAR(180) NOT NULL,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    payroll_unit_id BIGINT REFERENCES payroll_units(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processed',
    total_employees INTEGER NOT NULL DEFAULT 0,
    gross_total NUMERIC(16,2) NOT NULL DEFAULT 0,
    deduction_total NUMERIC(16,2) NOT NULL DEFAULT 0,
    net_total NUMERIC(16,2) NOT NULL DEFAULT 0,
    ctc_total NUMERIC(16,2) NOT NULL DEFAULT 0,
    processed_at TIMESTAMP,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (period_month BETWEEN 1 AND 12),
    CHECK (status IN ('draft', 'processed', 'approved', 'locked', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS payroll_run_lines (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    assignment_id BIGINT REFERENCES employee_salary_assignments(id) ON DELETE SET NULL,
    emp_code VARCHAR(50) NOT NULL,
    emp_email VARCHAR(255),
    emp_name VARCHAR(255),
    project VARCHAR(255),
    designation VARCHAR(255),
    doj DATE,
    offer_type VARCHAR(80),
    offered_ctc NUMERIC(14,2),
    offered_gross_pay NUMERIC(14,2),
    days_in_period NUMERIC(6,2) NOT NULL DEFAULT 0,
    working_days NUMERIC(6,2) NOT NULL DEFAULT 0,
    basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
    hra NUMERIC(14,2) NOT NULL DEFAULT 0,
    da NUMERIC(14,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
    special_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
    gross_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
    pf_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
    esi_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
    professional_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
    salary_advance NUMERIC(14,2) NOT NULL DEFAULT 0,
    gmi NUMERIC(14,2) NOT NULL DEFAULT 0,
    tds NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
    arrears NUMERIC(14,2) NOT NULL DEFAULT 0,
    others NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
    pf_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
    esi_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
    ctc NUMERIC(14,2) NOT NULL DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (run_id, emp_code)
);

CREATE TABLE IF NOT EXISTS payroll_run_components (
    id BIGSERIAL PRIMARY KEY,
    run_line_id BIGINT NOT NULL REFERENCES payroll_run_lines(id) ON DELETE CASCADE,
    component_code VARCHAR(80) NOT NULL,
    component_name VARCHAR(150) NOT NULL,
    component_type VARCHAR(40) NOT NULL,
    monthly_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    annual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_components_type_status
    ON payroll_components (component_type, status);
CREATE INDEX IF NOT EXISTS idx_payroll_salary_structures_status
    ON payroll_salary_structures (status);
CREATE INDEX IF NOT EXISTS idx_employee_salary_assignments_emp_code
    ON employee_salary_assignments (emp_code, status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period
    ON payroll_runs (period_year, period_month, payroll_unit_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_run_id
    ON payroll_run_lines (run_id);

INSERT INTO payroll_header_columns (column_key, column_label, source_field, display_order, is_required)
VALUES
    ('serial_no', 'S#', 'serial_no', 1, TRUE),
    ('emp_code', 'EMP ID', 'emp_code', 2, TRUE),
    ('project', 'PROJECT', 'project', 3, FALSE),
    ('emp_name', 'NAME', 'emp_name', 4, TRUE),
    ('designation', 'DESIGNATION', 'designation', 5, FALSE),
    ('doj', 'DOJ', 'doj', 6, FALSE),
    ('offer_type', 'Offer Type', 'offer_type', 7, FALSE),
    ('offered_ctc', 'offered CTC', 'offered_ctc', 8, FALSE),
    ('offered_gross_pay', 'offered GP', 'offered_gross_pay', 9, FALSE),
    ('days_in_period', 'Days', 'days_in_period', 10, TRUE),
    ('working_days', 'No of working', 'working_days', 11, TRUE),
    ('basic_salary', 'BS (50%)', 'basic_salary', 12, FALSE),
    ('hra', 'HRA (50%)', 'hra', 13, FALSE),
    ('da', 'DA', 'da', 14, FALSE),
    ('subtotal', 'SUB TOTAL', 'subtotal', 15, FALSE),
    ('bonus', 'Bonus', 'bonus', 16, FALSE),
    ('special_allowance', 'Sp. Allow.', 'special_allowance', 17, FALSE),
    ('gross_pay', 'GP', 'gross_pay', 18, FALSE),
    ('pf_employee', 'PF 12%', 'pf_employee', 19, FALSE),
    ('esi_employee', 'ESI 0.75%', 'esi_employee', 20, FALSE),
    ('professional_tax', 'Proff Tax', 'professional_tax', 21, FALSE),
    ('salary_advance', 'Sal Adv', 'salary_advance', 22, FALSE),
    ('gmi', 'GMI', 'gmi', 23, FALSE),
    ('tds', 'TDS', 'tds', 24, FALSE),
    ('total_deduction', 'Total Deduction', 'total_deduction', 25, FALSE),
    ('net_pay', 'NET PAY', 'net_pay', 26, FALSE),
    ('arrears', 'Arrears', 'arrears', 27, FALSE),
    ('others', 'Others', 'others', 28, FALSE),
    ('total_pay', 'TOTAL PAY', 'total_pay', 29, FALSE),
    ('pf_employer', 'PF 13%', 'pf_employer', 30, FALSE),
    ('esi_employer', 'ESI@ 3.25', 'esi_employer', 31, FALSE),
    ('ctc', 'CTC', 'ctc', 32, FALSE),
    ('remark', 'Remark', 'remark', 33, FALSE)
ON CONFLICT (column_key) DO UPDATE SET
    column_label = EXCLUDED.column_label,
    source_field = EXCLUDED.source_field,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    updated_at = NOW();

INSERT INTO payroll_components (
    component_code,
    component_name,
    component_type,
    calculation_type,
    base_component_code,
    rate_percent,
    cap_amount,
    is_taxable,
    affects_gross,
    affects_net,
    affects_ctc,
    display_order
)
VALUES
    ('basic_salary', 'Basic @ 50% of the Gross', 'earning', 'percentage', 'gross_pay', 50.0000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
    ('hra', 'HRA @ 50% of the Basic', 'earning', 'percentage', 'basic_salary', 50.0000, NULL, TRUE, TRUE, TRUE, TRUE, 20),
    ('da', 'DA', 'earning', 'percentage', 'gross_pay', 5.0000, NULL, TRUE, TRUE, TRUE, TRUE, 30),
    ('bonus', 'Bonus', 'earning', 'percentage', 'gross_pay', 6.6629, NULL, TRUE, TRUE, TRUE, TRUE, 40),
    ('special_allowance', 'Special Allowance', 'earning', 'formula', 'gross_pay', NULL, NULL, TRUE, TRUE, TRUE, TRUE, 50),
    ('pf_employee', 'EPF', 'employee_deduction', 'percentage', 'basic_salary', 12.0000, 1800.00, FALSE, FALSE, TRUE, FALSE, 110),
    ('esi_employee', 'ESIC', 'employee_deduction', 'percentage', 'gross_pay', 0.7500, NULL, FALSE, FALSE, TRUE, FALSE, 120),
    ('professional_tax', 'Professional Tax', 'employee_deduction', 'fixed', NULL, NULL, NULL, FALSE, FALSE, TRUE, FALSE, 130),
    ('pf_employer', 'Employer EPF', 'employer_contribution', 'percentage', 'basic_salary', 13.0000, 1950.00, FALSE, FALSE, FALSE, TRUE, 210),
    ('esi_employer', 'Employer ESIC', 'employer_contribution', 'percentage', 'gross_pay', 3.2500, NULL, FALSE, FALSE, FALSE, TRUE, 220)
ON CONFLICT (component_code) DO UPDATE SET
    component_name = EXCLUDED.component_name,
    component_type = EXCLUDED.component_type,
    calculation_type = EXCLUDED.calculation_type,
    base_component_code = EXCLUDED.base_component_code,
    rate_percent = EXCLUDED.rate_percent,
    cap_amount = EXCLUDED.cap_amount,
    is_taxable = EXCLUDED.is_taxable,
    affects_gross = EXCLUDED.affects_gross,
    affects_net = EXCLUDED.affects_net,
    affects_ctc = EXCLUDED.affects_ctc,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
