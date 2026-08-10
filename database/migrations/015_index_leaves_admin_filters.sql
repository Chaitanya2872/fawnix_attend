-- Speed up the admin leaves board query (/api/admin/leaves/board), which
-- filters and sorts on status, leave_type, applied_at, and manager_code.

CREATE INDEX IF NOT EXISTS idx_leaves_status
    ON leaves(status);

CREATE INDEX IF NOT EXISTS idx_leaves_leave_type
    ON leaves(leave_type);

CREATE INDEX IF NOT EXISTS idx_leaves_applied_at
    ON leaves(applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaves_manager_code_only
    ON leaves(manager_code);

CREATE INDEX IF NOT EXISTS idx_leaves_status_type
    ON leaves(status, leave_type);
