ALTER TABLE applications ADD COLUMN interview_at DATETIME(6) NULL;
ALTER TABLE applications ADD COLUMN interview_duration_minutes INT NULL;
ALTER TABLE applications ADD COLUMN interview_location VARCHAR(500) NULL;
ALTER TABLE applications ADD COLUMN interview_notes VARCHAR(2000) NULL;
