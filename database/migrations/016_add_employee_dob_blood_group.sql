-- Adds date of birth and blood group to the employees table for the Employee
-- Master add/edit form. Guarded the same way migration 008 added
-- emp_shift_id/emp_joining_date, since `employees` predates this repo's
-- migration history and isn't created by CREATE TABLE anywhere here.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'emp_date_of_birth'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN emp_date_of_birth DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'emp_blood_group'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN emp_blood_group VARCHAR(5);
    END IF;
END $$;
