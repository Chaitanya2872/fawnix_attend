CREATE TABLE IF NOT EXISTS compoff_requests (
    request_id BIGSERIAL PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL,
    emp_email VARCHAR(255) NOT NULL,
    emp_name VARCHAR(255) NOT NULL,
    overtime_record_ids BIGINT[] NOT NULL DEFAULT '{}',
    total_comp_days NUMERIC(3,1) NOT NULL DEFAULT 0,
    consumed_days NUMERIC(3,1) NOT NULL DEFAULT 0,
    available_days NUMERIC(3,1) NOT NULL DEFAULT 0,
    reason TEXT,
    notes TEXT,
    approval_level VARCHAR(20) NOT NULL DEFAULT 'manager',
    approver_emp_code VARCHAR(50),
    approver_remarks TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    available_at TIMESTAMP,
    expires_at TIMESTAMP,
    expired_at TIMESTAMP,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS consumed_days NUMERIC(3,1) NOT NULL DEFAULT 0;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS available_days NUMERIC(3,1) NOT NULL DEFAULT 0;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS emp_email VARCHAR(255);
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS emp_name VARCHAR(255);
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS overtime_record_ids BIGINT[] NOT NULL DEFAULT '{}';
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS total_comp_days NUMERIC(3,1) NOT NULL DEFAULT 0;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS approval_level VARCHAR(20) NOT NULL DEFAULT 'manager';
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS approver_emp_code VARCHAR(50);
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS approver_remarks TEXT;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS available_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP;
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE compoff_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS compoff_avail_requests (
    avail_request_id BIGSERIAL PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL,
    emp_email VARCHAR(255) NOT NULL,
    emp_name VARCHAR(255) NOT NULL,
    avail_date DATE NOT NULL,
    avail_type VARCHAR(20) NOT NULL,
    requested_days NUMERIC(2,1) NOT NULL,
    remarks TEXT,
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approval_level VARCHAR(20) NOT NULL DEFAULT 'manager',
    approver_emp_code VARCHAR(50),
    approver_remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compoff_avail_request_allocations (
    id BIGSERIAL PRIMARY KEY,
    avail_request_id BIGINT NOT NULL,
    compoff_request_id BIGINT NOT NULL,
    allocated_days NUMERIC(2,1) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE overtime_records ADD COLUMN IF NOT EXISTS compoff_request_id BIGINT;
ALTER TABLE overtime_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE overtime_records ADD COLUMN IF NOT EXISTS approval_completed_at TIMESTAMP;
ALTER TABLE overtime_records ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;
ALTER TABLE overtime_records ADD COLUMN IF NOT EXISTS utilized_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_compoff_requests_emp_status_created
ON compoff_requests(emp_code, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compoff_requests_status_expires
ON compoff_requests(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_compoff_avail_requests_emp_status_created
ON compoff_avail_requests(emp_code, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compoff_avail_requests_avail_date
ON compoff_avail_requests(avail_date, status);

CREATE INDEX IF NOT EXISTS idx_compoff_avail_allocations_request
ON compoff_avail_request_allocations(avail_request_id, compoff_request_id);

CREATE INDEX IF NOT EXISTS idx_overtime_records_emp_status_deadline
ON overtime_records(emp_code, status, recording_deadline);
