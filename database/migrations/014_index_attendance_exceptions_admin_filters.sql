-- Speed up the admin attendance-exceptions list/KPI query, which filters and
-- sorts on status, exception_type, exception_date, emp_code, and attendance_id.

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_status
    ON attendance_exceptions(status);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_type
    ON attendance_exceptions(exception_type);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_date
    ON attendance_exceptions(exception_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_emp_code
    ON attendance_exceptions(emp_code);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_attendance_id
    ON attendance_exceptions(attendance_id);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_type_status
    ON attendance_exceptions(exception_type, status);
