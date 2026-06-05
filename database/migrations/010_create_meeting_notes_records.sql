CREATE TABLE IF NOT EXISTS meeting_notes_records (
    meeting_note_id VARCHAR(64) PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL,
    meeting_title VARCHAR(255),
    language VARCHAR(32),
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    provider VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded',
    audio_bucket VARCHAR(255),
    audio_object_name VARCHAR(500),
    audio_url TEXT,
    audio_folder VARCHAR(255),
    audio_size_bytes BIGINT,
    transcript TEXT,
    summary TEXT,
    minutes_of_meeting TEXT,
    important_points_json TEXT,
    report_bucket VARCHAR(255),
    report_object_name VARCHAR(500),
    report_url TEXT,
    report_download_url TEXT,
    report_file_name VARCHAR(255),
    report_content_type VARCHAR(100),
    report_size_bytes BIGINT,
    generated_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_records_emp_created
ON meeting_notes_records(emp_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_records_status_created
ON meeting_notes_records(status, created_at DESC);
