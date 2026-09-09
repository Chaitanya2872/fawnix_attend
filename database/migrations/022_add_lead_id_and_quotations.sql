-- Persist the lead a field/branch visit is linked to (the column was accepted
-- by the API and echoed back in responses, but never actually stored), and
-- add tables for lead quotations built from the mobile app.

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS lead_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id
    ON activities(lead_id)
    WHERE lead_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_quotations (
    id SERIAL PRIMARY KEY,
    lead_id VARCHAR(64) NOT NULL,
    quotation_number VARCHAR(32),
    title VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by_emp_code VARCHAR(50),
    created_by_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_quotations_lead_id
    ON lead_quotations(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_quotations_created_by
    ON lead_quotations(created_by_emp_code);

CREATE TABLE IF NOT EXISTS lead_quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES lead_quotations(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lead_quotation_items_quotation_id
    ON lead_quotation_items(quotation_id);
