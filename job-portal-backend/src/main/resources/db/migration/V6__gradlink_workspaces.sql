CREATE TABLE companies (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
 website VARCHAR(500), description VARCHAR(2000), owner_id BIGINT NOT NULL UNIQUE,
 FOREIGN KEY (owner_id) REFERENCES users(id)
);
ALTER TABLE jobs ADD COLUMN company_id BIGINT NULL;
ALTER TABLE jobs ADD COLUMN required_skills VARCHAR(2000);
ALTER TABLE jobs ADD COLUMN location VARCHAR(255);
ALTER TABLE jobs ADD COLUMN employment_type VARCHAR(255);
ALTER TABLE jobs ADD CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE TABLE candidate_profiles (
 id BIGINT PRIMARY KEY, headline VARCHAR(255), skills VARCHAR(2000), education VARCHAR(4000),
 projects VARCHAR(4000), portfolio_url VARCHAR(500), location VARCHAR(255), availability VARCHAR(255),
 cv_name VARCHAR(255), cv_data LONGBLOB,
 FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE application_messages (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, application_id BIGINT NOT NULL,
 sender_id BIGINT NOT NULL, sender_name VARCHAR(255) NOT NULL, body VARCHAR(4000) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
CREATE TABLE application_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, application_id BIGINT NOT NULL,
 stage VARCHAR(255) NOT NULL, actor_name VARCHAR(255) NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
CREATE INDEX ix_messages_application ON application_messages(application_id);
CREATE INDEX ix_history_application ON application_history(application_id);
