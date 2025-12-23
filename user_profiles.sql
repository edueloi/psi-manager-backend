
/* =========================================================
   TABLE: user_profiles
   Stores profile data for /perfil (user-specific)
   Compatible with MySQL 5.7+ and 8.0+
   ========================================================= */

CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT NOT NULL,
  crp VARCHAR(50) NULL,
  specialty VARCHAR(255) NULL,
  company_name VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  bio TEXT NULL,
  avatar_url LONGTEXT NULL,
  clinic_logo_url LONGTEXT NULL,
  cover_url LONGTEXT NULL,
  schedule_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_profiles_user_id (user_id),
  KEY idx_user_profiles_tenant_id (tenant_id),
  CONSTRAINT fk_user_profiles_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
