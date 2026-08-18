-- Manual corrections applied on top of the derived monthly attendance matrix.
-- The heatmap derives each day's status from attendance/leave/holiday data on
-- demand; a row here pins one employee-day to an admin-chosen status instead.

BEGIN;

CREATE TABLE IF NOT EXISTS attendance_day_overrides (
    id SERIAL PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL,
    override_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    remarks TEXT,
    updated_by_emp_code VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_day_overrides_status_check
        CHECK (status IN ('P', 'S', 'WFH', 'A', 'L', 'H', 'O')),
    CONSTRAINT attendance_day_overrides_emp_date_key UNIQUE (emp_code, override_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_day_overrides_date
    ON attendance_day_overrides (override_date);

COMMIT;
