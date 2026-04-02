-- Expand attendance_exceptions so late-arrival and early-leave workflows
-- can store employee/manager metadata and support pre-clock-in late submissions.

BEGIN;

ALTER TABLE attendance_exceptions
    ALTER COLUMN attendance_id DROP NOT NULL;

ALTER TABLE attendance_exceptions
    ADD COLUMN IF NOT EXISTS emp_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS emp_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emp_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS exception_date DATE,
    ADD COLUMN IF NOT EXISTS exception_time TIME,
    ADD COLUMN IF NOT EXISTS planned_arrival_time TIME,
    ADD COLUMN IF NOT EXISTS late_by_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS early_by_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS manager_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS manager_remarks TEXT;

UPDATE attendance_exceptions ae
SET
    emp_code = COALESCE(ae.emp_code, e.emp_code),
    emp_name = COALESCE(ae.emp_name, a.employee_name),
    emp_email = COALESCE(ae.emp_email, a.employee_email),
    exception_date = COALESCE(ae.exception_date, a.date),
    exception_time = COALESCE(
        ae.exception_time,
        CASE
            WHEN ae.exception_type = 'late_arrival' THEN a.login_time::time
            WHEN ae.exception_type = 'early_leave' THEN a.logout_time::time
            ELSE NULL
        END
    ),
    late_by_minutes = COALESCE(
        ae.late_by_minutes,
        CASE
            WHEN ae.exception_type = 'late_arrival' THEN NULL
            ELSE ae.late_by_minutes
        END
    ),
    manager_code = COALESCE(ae.manager_code, e.emp_manager),
    manager_email = COALESCE(ae.manager_email, m.emp_email),
    reviewed_by = COALESCE(ae.reviewed_by, ae.approved_by),
    reviewed_at = COALESCE(ae.reviewed_at, ae.approved_at),
    requested_at = COALESCE(ae.requested_at, ae.created_at, NOW()),
    updated_at = COALESCE(ae.updated_at, NOW())
FROM attendance a
LEFT JOIN employees e ON e.emp_email = a.employee_email
LEFT JOIN employees m ON m.emp_code = e.emp_manager
WHERE ae.attendance_id = a.id;

COMMIT;
