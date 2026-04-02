BEGIN;

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) NOT NULL DEFAULT 'office';

UPDATE attendance
SET attendance_type = 'office'
WHERE attendance_type IS NULL OR attendance_type = '';

COMMIT;
