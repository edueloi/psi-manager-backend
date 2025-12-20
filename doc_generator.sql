-- Document generator schema
CREATE TABLE IF NOT EXISTS document_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_document_categories (tenant_id, name),
  KEY idx_document_categories_tenant_id (tenant_id),
  CONSTRAINT fk_document_categories_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  category_id INT NULL,
  title VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50) NULL,
  template_body LONGTEXT NOT NULL,
  header_logo_url VARCHAR(1024) NULL,
  footer_logo_url VARCHAR(1024) NULL,
  signature_name VARCHAR(255) NULL,
  signature_crp VARCHAR(100) NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_document_templates_tenant_id (tenant_id),
  KEY idx_document_templates_category_id (category_id),
  CONSTRAINT fk_document_templates_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_document_templates_category_id FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  template_id INT NOT NULL,
  patient_id INT NULL,
  professional_user_id INT NULL,
  title VARCHAR(255) NOT NULL,
  data_json JSON NULL,
  rendered_html LONGTEXT NULL,
  file_url VARCHAR(1024) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_document_instances_tenant_id (tenant_id),
  KEY idx_document_instances_template_id (template_id),
  KEY idx_document_instances_patient_id (patient_id),
  CONSTRAINT fk_document_instances_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_document_instances_template_id FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_document_instances_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_document_instances_professional_user_id FOREIGN KEY (professional_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
