CREATE TABLE IF NOT EXISTS meeting_notes_jobs (
    job_id VARCHAR(64) PRIMARY KEY,
    meeting_note_id VARCHAR(64) NOT NULL REFERENCES meeting_notes_records(meeting_note_id) ON DELETE CASCADE,
    emp_code VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    provider VARCHAR(20),
    last_error TEXT,
    queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    available_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    heartbeat_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_jobs_status_available
ON meeting_notes_jobs(status, available_at, queued_at);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_jobs_meeting_note
ON meeting_notes_jobs(meeting_note_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_notes_jobs_active_note
ON meeting_notes_jobs(meeting_note_id)
WHERE status IN ('queued', 'processing', 'retrying');
