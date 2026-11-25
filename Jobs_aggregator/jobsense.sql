CREATE DATABASE IF NOT EXISTS jobsense;
USE jobsense;

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('candidate', 'admin') NOT NULL DEFAULT 'candidate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    contract_type VARCHAR(100),
    description TEXT,
    salary VARCHAR(100),
    source VARCHAR(100) DEFAULT 'welovedevs',
    published_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Implimentation directement dans la base de données de l'administrateur avec le mot de passe déjà hashed
INSERT INTO users (
    first_name,
    last_name,
    email,
    password_hash,
    role
) VALUES (
    'Admin',
    'Admin',
    'admin@gmail.com',
    '$2b$10$3yQ4K7Emn2sQ1dbU69QCKO38OxR.kjO54MP4G3KYqgk8n1kv5A1H2', -- mot de passe: admin123
    'admin'
);