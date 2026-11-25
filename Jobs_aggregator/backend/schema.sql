-- Active: 1761922876791@@127.0.0.1@3306@jobsense
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(100)  NOT NULL,
  last_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  DEFAULT NULL,
  google_id     VARCHAR(255)  UNIQUE DEFAULT NULL,
  github_id     VARCHAR(255)  UNIQUE DEFAULT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'candidate'
                  CHECK (role IN ('candidate', 'recruiter', 'admin')),
  status        VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'banned')),

  -- Candidats : type de recherche (stage, emploi, ou les deux)
  search_type   VARCHAR(20)   DEFAULT NULL
                  CHECK (search_type IN ('internship', 'job', 'both') OR search_type IS NULL),

  -- Recruteurs : informations entreprise
  company       VARCHAR(200)  DEFAULT NULL,
  job_title     VARCHAR(200)  DEFAULT NULL,

  -- 2FA
  two_factor_secret  VARCHAR(255)  DEFAULT NULL,
  two_factor_enabled BOOLEAN       DEFAULT FALSE,

  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_search_type ON users(search_type);

CREATE TABLE IF NOT EXISTS banned_emails (
  email      VARCHAR(255) PRIMARY KEY,
  reason     VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table from WeLoveDevs API
CREATE TABLE IF NOT EXISTS jobs (
  id            VARCHAR(255) PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  company       VARCHAR(255)  NOT NULL,
  description   LONGTEXT,
  location      VARCHAR(255),
  salary_min    INT DEFAULT NULL,
  salary_max    INT DEFAULT NULL,
  contract_type VARCHAR(50)   DEFAULT 'CDI',
  remote        BOOLEAN       DEFAULT FALSE,
  url           VARCHAR(500),
  logo          VARCHAR(10),
  tags          JSON,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
