-- =============================================================
-- Migration: Add Comp-Off Trigger and Function
-- Purpose: Auto-populate comp-off records when attendance updates
-- This ensures comp-offs are loaded correctly on clock-out
-- =============================================================

-- 1. Add is_compoff_session column to attendance table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='attendance' AND column_name='is_compoff_session'
    ) THEN
        ALTER TABLE attendance ADD COLUMN is_compoff_session BOOLEAN DEFAULT false;
        COMMENT ON COLUMN attendance.is_compoff_session IS 'TRUE if this is a comp-off eligible session (non-working day)';
    END IF;
END $$;

-- 2. Create function to check if date is a working day
CREATE OR REPLACE FUNCTION is_working_day(check_date DATE, emp_code_param VARCHAR) RETURNS BOOLEAN AS $$
DECLARE
    week_of_month INT;
    day_of_week INT;
    holiday_count INT;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week := EXTRACT(DOW FROM check_date)::INT;
    
    -- Check if Sunday (day_of_week = 0)
    IF day_of_week = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if 2nd or 4th Saturday (day_of_week = 6)
    IF day_of_week = 6 THEN
        week_of_month := (EXTRACT(DAY FROM check_date)::INT - 1) / 7 + 1;
        IF week_of_month IN (2, 4) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check if organization holiday
    SELECT COUNT(*) INTO holiday_count FROM organization_holidays 
    WHERE holiday_date = check_date LIMIT 1;
    
    IF holiday_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- If none of the above, it's a working day
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create function to mark comp-off eligible sessions
CREATE OR REPLACE FUNCTION mark_compoff_session() RETURNS TRIGGER AS $$
DECLARE
    emp_code_val VARCHAR;
    existing_sessions INT;
BEGIN
    -- Get employee's emp_code from employees table using email
    SELECT emp_code INTO emp_code_val FROM employees 
    WHERE emp_email = NEW.employee_email LIMIT 1;
    
    -- If employee found and date is non-working day, mark as comp-off session
    IF emp_code_val IS NOT NULL THEN
        -- If it's a non-working day, mark as comp-off session
        IF NOT is_working_day(NEW.date, emp_code_val) THEN
            NEW.is_compoff_session := TRUE;
        ELSE
            -- On working days, mark as comp-off session when this is the second (or later)
            -- attendance session for the same employee on the same date.
            IF TG_OP = 'UPDATE' THEN
                SELECT COUNT(*) INTO existing_sessions
                FROM attendance
                WHERE employee_email = NEW.employee_email
                  AND date = NEW.date
                  AND id <> NEW.id;
            ELSE
                SELECT COUNT(*) INTO existing_sessions
                FROM attendance
                WHERE employee_email = NEW.employee_email
                  AND date = NEW.date;
            END IF;

            IF existing_sessions >= 1 THEN
                NEW.is_compoff_session := TRUE;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on INSERT for attendance table
DROP TRIGGER IF EXISTS trigger_mark_compoff_on_insert ON attendance;
CREATE TRIGGER trigger_mark_compoff_on_insert
BEFORE INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION mark_compoff_session();

-- 5. Create trigger on UPDATE for attendance table
DROP TRIGGER IF EXISTS trigger_mark_compoff_on_update ON attendance;
CREATE TRIGGER trigger_mark_compoff_on_update
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION mark_compoff_session();

-- 6. Create function to auto-populate overtime_records when attendance is updated with logout_time
CREATE OR REPLACE FUNCTION populate_compoff_on_clockout() RETURNS TRIGGER AS $$
DECLARE
    emp_code_val VARCHAR;
    emp_name_val VARCHAR;
    working_hours_val NUMERIC;
    is_work_day BOOLEAN;
    existing_count INT;
BEGIN
    -- Only trigger when logout_time is set (clock-out happening)
    IF NEW.logout_time IS NOT NULL AND OLD.logout_time IS NULL THEN
        
        -- Get employee info
        SELECT emp_code, emp_full_name INTO emp_code_val, emp_name_val FROM employees 
        WHERE emp_email = NEW.employee_email LIMIT 1;
        
        IF emp_code_val IS NOT NULL THEN
            -- Check if it's a non-working day
            is_work_day := is_working_day(NEW.date, emp_code_val);
            
            -- Only create overtime record if:
            -- 1. It's a non-working day (comp-off eligible), OR
            -- 2. is_compoff_session flag is true
            IF NOT is_work_day OR NEW.is_compoff_session THEN
                
                -- Check if overtime record already exists for this attendance
                SELECT COUNT(*) INTO existing_count FROM overtime_records 
                WHERE attendance_id = NEW.id LIMIT 1;
                
                -- Create overtime record if it doesn't exist
                IF existing_count = 0 AND NEW.working_hours IS NOT NULL THEN
                    INSERT INTO overtime_records (
                        emp_code, emp_email, emp_name,
                        attendance_id, work_date, day_of_week, day_type,
                        standard_hours, actual_hours, extra_hours,
                        status, expires_at, recording_deadline
                    ) VALUES (
                        emp_code_val,
                        NEW.employee_email,
                        emp_name_val,
                        NEW.id,
                        NEW.date,
                        TO_CHAR(NEW.date, 'Day'),
                        CASE WHEN is_work_day THEN 'working' ELSE 'non_working' END,
                        CASE WHEN is_work_day THEN 8.0 ELSE 0.0 END,  -- Default 8h standard for working days
                        NEW.working_hours,
                        CASE WHEN is_work_day THEN NEW.working_hours - 8.0 ELSE NEW.working_hours END,  -- extra_hours
                        'eligible',
                        NEW.date + INTERVAL '90 days',
                        NEW.date + INTERVAL '30 days'
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-populate comp-off on clock-out
DROP TRIGGER IF EXISTS trigger_populate_compoff_on_clockout ON attendance;
CREATE TRIGGER trigger_populate_compoff_on_clockout
AFTER UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION populate_compoff_on_clockout();

-- 8. Update existing non-working day attendance to mark as comp-off sessions
UPDATE attendance a
SET is_compoff_session = true
FROM employees e
WHERE a.employee_email = e.emp_email
  AND a.logout_time IS NOT NULL
  AND is_working_day(a.date, e.emp_code) = FALSE;

-- 9. Retroactively mark working-day sessions that are second+ clock-ins as comp-off sessions
UPDATE attendance a
SET is_compoff_session = true
FROM employees e
WHERE a.employee_email = e.emp_email
  AND a.logout_time IS NOT NULL
  AND is_working_day(a.date, e.emp_code) = TRUE
  AND EXISTS (
      SELECT 1 FROM attendance a2
      WHERE a2.employee_email = a.employee_email
        AND a2.date = a.date
        AND a2.id <> a.id
  );

COMMIT;

-- Verification queries
-- SELECT 'Comp-off sessions marked:' as status, COUNT(*) FROM attendance WHERE is_compoff_session = TRUE;
-- SELECT 'Overtime records count:' as status, COUNT(*) FROM overtime_records;
