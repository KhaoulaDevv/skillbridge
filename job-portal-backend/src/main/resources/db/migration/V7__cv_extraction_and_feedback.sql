ALTER TABLE candidate_profiles ADD COLUMN extracted_skills VARCHAR(2000);
ALTER TABLE candidate_profiles ADD COLUMN extraction_summary VARCHAR(1000);
CREATE TABLE interview_feedback (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, application_id BIGINT NOT NULL, interviewer_id BIGINT NOT NULL,
 interviewer_name VARCHAR(255) NOT NULL, rating INT NOT NULL, recommendation VARCHAR(40) NOT NULL,
 strengths VARCHAR(2000), concerns VARCHAR(2000), notes VARCHAR(4000), created_at DATETIME(6) NOT NULL,
 FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
CREATE INDEX ix_feedback_application ON interview_feedback(application_id);
