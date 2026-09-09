-- Persist the lead a field/branch visit is linked to. The column was already
-- accepted by /api/activities/start and echoed back in the response, but was
-- never actually written to the database - there was no way to answer "which
-- field visit is linked to this lead" because nothing was ever stored.

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS lead_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id
    ON activities(lead_id)
    WHERE lead_id IS NOT NULL;
