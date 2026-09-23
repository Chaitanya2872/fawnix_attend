-- Optional per-person audience for schedule triggers. When set, each run sends one email
-- per matching employee (e.g. 'employees_not_clocked_in') instead of a single email.
ALTER TABLE email_triggers ADD COLUMN IF NOT EXISTS audience VARCHAR(50);
