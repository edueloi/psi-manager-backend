-- Case studies / boards
CREATE TABLE IF NOT EXISTS case_study_boards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_case_study_boards_tenant_id (tenant_id),
  KEY idx_case_study_boards_created_by (created_by),
  CONSTRAINT fk_case_study_boards_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_study_boards_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_columns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  color VARCHAR(32) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_case_study_columns_board_id (board_id),
  CONSTRAINT fk_case_study_columns_board_id FOREIGN KEY (board_id) REFERENCES case_study_boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  column_id INT NOT NULL,
  patient_id INT NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  tags_json JSON NULL,
  details_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_case_study_cards_board_id (board_id),
  KEY idx_case_study_cards_column_id (column_id),
  KEY idx_case_study_cards_patient_id (patient_id),
  CONSTRAINT fk_case_study_cards_board_id FOREIGN KEY (board_id) REFERENCES case_study_boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_study_cards_column_id FOREIGN KEY (column_id) REFERENCES case_study_columns(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_study_cards_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_case_study_cards_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL,
  author_user_id INT NULL,
  comment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_case_study_comments_card_id (card_id),
  KEY idx_case_study_comments_author_user_id (author_user_id),
  CONSTRAINT fk_case_study_comments_card_id FOREIGN KEY (card_id) REFERENCES case_study_cards(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_study_comments_author_user_id FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_study_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  file_type VARCHAR(50) NULL,
  file_size INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_case_study_attachments_card_id (card_id),
  CONSTRAINT fk_case_study_attachments_card_id FOREIGN KEY (card_id) REFERENCES case_study_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
