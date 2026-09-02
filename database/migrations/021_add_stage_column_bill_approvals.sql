-- Add `stage` column to `bill_approvals` so approval stages are stored explicitly.
-- Also add an index and backfill any stage tokens embedded in comments.

ALTER TABLE IF EXISTS bill_approvals
    ADD COLUMN IF NOT EXISTS stage VARCHAR(64);

-- Backfill stage from comments where present in the format [stage=...]
UPDATE bill_approvals
SET stage = substring(comments FROM '\\[stage=([^\\]]+)\\]')
WHERE stage IS NULL AND comments IS NOT NULL AND comments ~ '\\[stage=';

CREATE INDEX IF NOT EXISTS idx_bill_approvals_stage ON bill_approvals(stage);
