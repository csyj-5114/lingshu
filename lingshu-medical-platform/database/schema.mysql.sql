CREATE DATABASE IF NOT EXISTS lingshu_medical
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE lingshu_medical;

CREATE TABLE t_user (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  real_name VARCHAR(50) NOT NULL,
  id_card_enc VARCHAR(128),
  phone_enc VARCHAR(128) NOT NULL,
  phone_hash CHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  approval_status VARCHAR(16) NOT NULL DEFAULT 'approved',
  review_reason VARCHAR(500),
  reviewed_by BIGINT UNSIGNED,
  reviewed_at DATETIME,
  login_fail_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  lock_until DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_phone_hash (phone_hash),
  KEY idx_role_status (role, status),
  CONSTRAINT chk_user_role CHECK (role IN ('PATIENT', 'DOCTOR', 'PHARMACIST', 'ADMIN')),
  CONSTRAINT chk_user_status CHECK (status IN (0, 1, 2)),
  CONSTRAINT chk_approval_status CHECK (approval_status IN ('approved', 'pending', 'rejected'))
) ENGINE=InnoDB;

CREATE TABLE t_patient (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  patient_no VARCHAR(20) NOT NULL,
  medical_history VARCHAR(2000),
  allergy_record VARCHAR(1000),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_patient_no (patient_no),
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB;

CREATE TABLE t_phone_verification (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  phone_hash CHAR(64) NOT NULL,
  purpose VARCHAR(16) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_phone_purpose_time (phone_hash, purpose, created_at),
  CONSTRAINT chk_phone_purpose CHECK (purpose IN ('register', 'reset'))
) ENGINE=InnoDB;

CREATE TABLE t_doctor (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  doctor_no VARCHAR(20) NOT NULL UNIQUE,
  department VARCHAR(50) NOT NULL,
  title VARCHAR(30),
  specialty VARCHAR(200),
  on_duty TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_department_duty (department, on_duty),
  CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB;

CREATE TABLE t_pharmacy (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pharmacy_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200),
  phone VARCHAR(20),
  license_no VARCHAR(50) NOT NULL,
  coop_status TINYINT NOT NULL DEFAULT 1,
  api_endpoint VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_coop_status (coop_status)
) ENGINE=InnoDB;

CREATE TABLE t_pharmacist (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  pharmacist_no VARCHAR(20) NOT NULL UNIQUE,
  pharmacy_id BIGINT UNSIGNED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pharmacy (pharmacy_id),
  CONSTRAINT fk_pharmacist_user FOREIGN KEY (user_id) REFERENCES t_user(id),
  CONSTRAINT fk_pharmacist_pharmacy FOREIGN KEY (pharmacy_id) REFERENCES t_pharmacy(id)
) ENGINE=InnoDB;

CREATE TABLE t_professional_qualification (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(16) NOT NULL,
  institution VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  title VARCHAR(50),
  specialty VARCHAR(300),
  license_no VARCHAR(80) NOT NULL,
  years_experience INT,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_path VARCHAR(500),
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by BIGINT UNSIGNED,
  review_reason VARCHAR(500),
  reviewed_at DATETIME,
  KEY idx_qualification_user (user_id),
  KEY idx_qualification_status (status, submitted_at),
  CONSTRAINT fk_qualification_user FOREIGN KEY (user_id) REFERENCES t_user(id),
  CONSTRAINT fk_qualification_reviewer FOREIGN KEY (reviewed_by) REFERENCES t_user(id),
  CONSTRAINT chk_qualification_role CHECK (role IN ('DOCTOR', 'PHARMACIST')),
  CONSTRAINT chk_qualification_status CHECK (status IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB;

CREATE TABLE t_ai_guide_session (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  symptom_desc VARCHAR(1000) NOT NULL,
  symptom_duration VARCHAR(50),
  recommended_dept VARCHAR(50),
  risk_tip VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_guide_patient (patient_id, created_at),
  CONSTRAINT fk_guide_patient FOREIGN KEY (patient_id) REFERENCES t_patient(id)
) ENGINE=InnoDB;

CREATE TABLE t_consultation (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  consult_no VARCHAR(32) NOT NULL UNIQUE,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  chief_complaint VARCHAR(1000) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_consult_patient (patient_id, status),
  KEY idx_consult_doctor (doctor_id, status),
  CONSTRAINT fk_consult_patient FOREIGN KEY (patient_id) REFERENCES t_patient(id),
  CONSTRAINT fk_consult_doctor FOREIGN KEY (doctor_id) REFERENCES t_doctor(id),
  CONSTRAINT chk_consult_status CHECK (status BETWEEN 1 AND 4)
) ENGINE=InnoDB;

CREATE TABLE t_consultation_message (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  consultation_id BIGINT UNSIGNED NOT NULL,
  sender_user_id BIGINT UNSIGNED NOT NULL,
  sender_type TINYINT NOT NULL,
  content_type TINYINT NOT NULL DEFAULT 1,
  content VARCHAR(2000) NOT NULL,
  sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_message_consult (consultation_id, sent_at),
  CONSTRAINT fk_message_consult FOREIGN KEY (consultation_id) REFERENCES t_consultation(id),
  CONSTRAINT fk_message_user FOREIGN KEY (sender_user_id) REFERENCES t_user(id)
) ENGINE=InnoDB;

CREATE TABLE t_ai_summary (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  consultation_id BIGINT UNSIGNED NOT NULL UNIQUE,
  chief_complaint VARCHAR(500) NOT NULL,
  symptom_duration VARCHAR(50),
  symptom_feature VARCHAR(500),
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_summary_consult FOREIGN KEY (consultation_id) REFERENCES t_consultation(id)
) ENGINE=InnoDB;

CREATE TABLE t_drug (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drug_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  spec VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  approval_no VARCHAR(20) NOT NULL UNIQUE,
  drug_type TINYINT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  contraindication VARCHAR(1000),
  enabled TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_name (name),
  KEY idx_type_enabled (drug_type, enabled),
  CONSTRAINT chk_drug_type CHECK (drug_type IN (1, 2))
) ENGINE=InnoDB;

CREATE TABLE t_prescription (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prescription_no VARCHAR(32) NOT NULL UNIQUE,
  consultation_id BIGINT UNSIGNED NOT NULL UNIQUE,
  doctor_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  pharmacist_id BIGINT UNSIGNED,
  pharmacy_id BIGINT UNSIGNED,
  diagnosis VARCHAR(500),
  status TINYINT NOT NULL DEFAULT 1,
  reject_reason VARCHAR(500),
  lock_pharmacist_id BIGINT UNSIGNED,
  lock_expire_at DATETIME,
  version INT NOT NULL DEFAULT 0,
  submitted_at DATETIME,
  reviewed_at DATETIME,
  transferred_at DATETIME,
  expire_at DATETIME,
  verified_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rx_doctor (doctor_id, status),
  KEY idx_rx_patient (patient_id, status),
  KEY idx_rx_submitted (submitted_at),
  KEY idx_rx_pharmacy (pharmacy_id),
  CONSTRAINT fk_rx_consult FOREIGN KEY (consultation_id) REFERENCES t_consultation(id),
  CONSTRAINT fk_rx_doctor FOREIGN KEY (doctor_id) REFERENCES t_doctor(id),
  CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id) REFERENCES t_patient(id),
  CONSTRAINT fk_rx_pharmacist FOREIGN KEY (pharmacist_id) REFERENCES t_pharmacist(id),
  CONSTRAINT fk_rx_pharmacy FOREIGN KEY (pharmacy_id) REFERENCES t_pharmacy(id),
  CONSTRAINT chk_rx_status CHECK (status IN (1, 2, 3, 4, 5))
) ENGINE=InnoDB;

CREATE TABLE t_prescription_item (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  prescription_id BIGINT UNSIGNED NOT NULL,
  drug_id BIGINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rx_drug (prescription_id, drug_id),
  CONSTRAINT fk_item_rx FOREIGN KEY (prescription_id) REFERENCES t_prescription(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_drug FOREIGN KEY (drug_id) REFERENCES t_drug(id),
  CONSTRAINT chk_item_quantity CHECK (quantity BETWEEN 1 AND 99)
) ENGINE=InnoDB;
