CREATE DATABASE IF NOT EXISTS jobsense;
USE jobsense;

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS banned_emails;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),

    role ENUM('candidate', 'recruiter', 'admin') NOT NULL DEFAULT 'candidate',
    status ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',

    search_type ENUM('internship', 'job', 'both') DEFAULT NULL,

    company VARCHAR(200) DEFAULT NULL,
    job_title VARCHAR(200) DEFAULT NULL,

    google_id VARCHAR(255) DEFAULT NULL,
    github_id VARCHAR(255) DEFAULT NULL,

    two_factor_secret VARCHAR(255) DEFAULT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,

    profile_data JSON DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE banned_emails (
    email VARCHAR(255) PRIMARY KEY,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description LONGTEXT,
    location VARCHAR(255),
    salary_min INT DEFAULT NULL,
    salary_max INT DEFAULT NULL,
    contract_type VARCHAR(50) DEFAULT 'CDI',
    remote BOOLEAN DEFAULT FALSE,
    url VARCHAR(500),
    logo VARCHAR(10),
    tags JSON,
    moderation_status ENUM('published', 'pending', 'hidden', 'rejected') NOT NULL DEFAULT 'published',
    moderation_note VARCHAR(500) DEFAULT NULL,
    moderated_at DATETIME DEFAULT NULL,
    moderated_by INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE saved_jobs (
    user_id INT NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    job_snapshot JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, job_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(255) NOT NULL,
    candidate_id INT NOT NULL,
    status ENUM('pending', 'submitted', 'reviewed', 'accepted', 'rejected') NOT NULL DEFAULT 'submitted',
    cover_letter TEXT,
    resume_text LONGTEXT,
    apply_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_candidate_job (job_id, candidate_id),
    FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Implimentation directement dans la base de données de l'administrateur avec le mot de passe déjà hashed
INSERT INTO users (
    first_name,
    last_name,
    email,
    password_hash,
    role
