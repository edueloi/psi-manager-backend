-- Full schema for psi-manager-backend (MySQL 8)
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Core: tenants and users
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  admin_name VARCHAR(255) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  admin_password_hash VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'mensal',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenants_admin_email (admin_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NULL,
  role ENUM('super_admin','admin','secretario','profissional') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_users_email (email),
  KEY idx_users_tenant_id (tenant_id),
  CONSTRAINT fk_users_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  whatsapp VARCHAR(30) NULL,
  cpf_cnpj VARCHAR(30) NULL,
  street VARCHAR(255) NULL,
  house_number VARCHAR(50) NULL,
  neighborhood VARCHAR(255) NULL,
  city VARCHAR(255) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  nationality VARCHAR(100) NULL,
  naturality VARCHAR(100) NULL,
  marital_status VARCHAR(50) NULL,
  education VARCHAR(100) NULL,
  profession VARCHAR(100) NULL,
  family_contact VARCHAR(255) NULL,
  has_children TINYINT(1) NULL,
  children_count INT NULL,
  minor_children_count INT NULL,
  spouse_name VARCHAR(255) NULL,
  convenio TINYINT(1) NULL,
  convenio_name VARCHAR(255) NULL,
  needs_reimbursement TINYINT(1) NULL,
  status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  psychologist_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_patients_tenant_id (tenant_id),
  KEY idx_patients_psychologist_id (psychologist_id),
  CONSTRAINT fk_patients_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_patients_psychologist_id FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services and packages
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NULL,
  duration INT NOT NULL DEFAULT 50,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  color VARCHAR(20) NULL,
  modality ENUM('online','presencial') NOT NULL DEFAULT 'presencial',
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_services_tenant_id (tenant_id),
  CONSTRAINT fk_services_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_service_packages_tenant_id (tenant_id),
  CONSTRAINT fk_service_packages_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_package_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  service_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_package_items_package_id (package_id),
  KEY idx_package_items_service_id (service_id),
  CONSTRAINT fk_package_items_package_id FOREIGN KEY (package_id) REFERENCES service_packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_package_items_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agenda / appointments
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NULL,
  psychologist_id INT NOT NULL,
  service_id INT NULL,
  appointment_date DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 50,
  status ENUM('scheduled','completed','cancelled','no-show','confirmed') NOT NULL DEFAULT 'scheduled',
  modality ENUM('online','presencial') NOT NULL DEFAULT 'presencial',
  type ENUM('consulta','bloqueio','pessoal') NOT NULL DEFAULT 'consulta',
  notes TEXT NULL,
  meeting_url VARCHAR(1024) NULL,
  recurrence_rule JSON NULL,
  recurrence_end_date DATE NULL,
  recurrence_count INT NULL,
  parent_appointment_id INT NULL,
  recurrence_index INT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appointments_tenant_id (tenant_id),
  KEY idx_appointments_patient_id (patient_id),
  KEY idx_appointments_psychologist_id (psychologist_id),
  KEY idx_appointments_service_id (service_id),
  KEY idx_appointments_parent_id (parent_appointment_id),
  CONSTRAINT fk_appointments_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_psychologist_id FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_parent_id FOREIGN KEY (parent_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  appointment_id INT NULL,
  patient_id INT NOT NULL,
  psychologist_id INT NOT NULL,
  status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sessions_tenant_id (tenant_id),
  KEY idx_sessions_appointment_id (appointment_id),
  KEY idx_sessions_patient_id (patient_id),
  KEY idx_sessions_psychologist_id (psychologist_id),
  CONSTRAINT fk_sessions_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_sessions_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_psychologist_id FOREIGN KEY (psychologist_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments / finance
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  appointment_id INT NULL,
  service_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('pix','credit','debit','cash','transfer','check','courtesy') NOT NULL,
  status ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_tenant_id (tenant_id),
  KEY idx_payments_patient_id (patient_id),
  KEY idx_payments_appointment_id (appointment_id),
  KEY idx_payments_service_id (service_id),
  CONSTRAINT fk_payments_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comandas
CREATE TABLE IF NOT EXISTS comandas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  status ENUM('aberta','paga','cancelada') NOT NULL DEFAULT 'aberta',
  description VARCHAR(255) NULL,
  discount_type ENUM('percentage','fixed') NULL,
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  frequency ENUM('unica','semanal','quinzenal','mensal') NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_comandas_tenant_id (tenant_id),
  KEY idx_comandas_patient_id (patient_id),
  CONSTRAINT fk_comandas_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_comandas_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id INT NOT NULL,
  service_id INT NULL,
  description VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comanda_items_comanda_id (comanda_id),
  KEY idx_comanda_items_service_id (service_id),
  CONSTRAINT fk_comanda_items_comanda_id FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
  CONSTRAINT fk_comanda_items_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id INT NOT NULL,
  session_number INT NOT NULL,
  session_date DATE NULL,
  status ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comanda_sessions_comanda_id (comanda_id),
  CONSTRAINT fk_comanda_sessions_comanda_id FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Virtual rooms
CREATE TABLE IF NOT EXISTS virtual_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  creator_user_id INT NOT NULL,
  code VARCHAR(32) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  scheduled_start DATETIME,
  scheduled_end DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_virtual_rooms_tenant_id (tenant_id),
  KEY idx_virtual_rooms_creator_user_id (creator_user_id),
  CONSTRAINT fk_virtual_rooms_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_rooms_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clinical tools (TCC / Schema / Psycho)
CREATE TABLE IF NOT EXISTS tcc_rpd_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  situation TEXT NOT NULL,
  thought TEXT NOT NULL,
  emotion VARCHAR(255) NULL,
  intensity INT NOT NULL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tcc_rpd_tenant_id (tenant_id),
  KEY idx_tcc_rpd_patient_id (patient_id),
  CONSTRAINT fk_tcc_rpd_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tcc_rpd_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_tcc_rpd_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tcc_coping_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tcc_cards_tenant_id (tenant_id),
  KEY idx_tcc_cards_patient_id (patient_id),
  CONSTRAINT fk_tcc_cards_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tcc_cards_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_tcc_cards_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  active_schemas JSON NOT NULL,
  modes JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_schema_snapshots_tenant_id (tenant_id),
  KEY idx_schema_snapshots_patient_id (patient_id),
  CONSTRAINT fk_schema_snapshots_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_schema_snapshots_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_schema_snapshots_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS psycho_dreams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  title VARCHAR(255) NULL,
  manifest TEXT NULL,
  latent TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_psycho_dreams_tenant_id (tenant_id),
  KEY idx_psycho_dreams_patient_id (patient_id),
  CONSTRAINT fk_psycho_dreams_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_dreams_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_dreams_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS psycho_free_text (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  content LONGTEXT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_psycho_free_text (tenant_id, patient_id),
  KEY idx_psycho_free_text_tenant_id (tenant_id),
  CONSTRAINT fk_psycho_free_text_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_free_text_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_free_text_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS psycho_signifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  term VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_psycho_signifiers_tenant_id (tenant_id),
  KEY idx_psycho_signifiers_patient_id (patient_id),
  CONSTRAINT fk_psycho_signifiers_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_signifiers_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_psycho_signifiers_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Forms
CREATE TABLE IF NOT EXISTS clinical_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  creator_user_id INT NULL,
  title VARCHAR(255) NOT NULL,
  hash VARCHAR(64) NOT NULL,
  description TEXT NULL,
  is_global TINYINT(1) NOT NULL DEFAULT 0,
  response_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_clinical_forms_hash (hash),
  KEY idx_clinical_forms_tenant_id (tenant_id),
  CONSTRAINT fk_clinical_forms_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_clinical_forms_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clinical_form_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  question_type ENUM('text','textarea','number','radio','checkbox','select') NOT NULL,
  question_text TEXT NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  KEY idx_form_questions_form_id (form_id),
  CONSTRAINT fk_form_questions_form_id FOREIGN KEY (form_id) REFERENCES clinical_forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clinical_form_interpretations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  min_score DECIMAL(10,2) NOT NULL,
  max_score DECIMAL(10,2) NOT NULL,
  result_title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  color VARCHAR(32) NULL,
  KEY idx_form_interpretations_form_id (form_id),
  CONSTRAINT fk_form_interpretations_form_id FOREIGN KEY (form_id) REFERENCES clinical_forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clinical_form_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  tenant_id INT NOT NULL,
  patient_id INT NULL,
  respondent_name VARCHAR(255) NULL,
  respondent_email VARCHAR(255) NULL,
  respondent_phone VARCHAR(30) NULL,
  answers_json JSON NOT NULL,
  score DECIMAL(10,2) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_form_responses_form_id (form_id),
  KEY idx_form_responses_tenant_id (tenant_id),
  KEY idx_form_responses_patient_id (patient_id),
  CONSTRAINT fk_form_responses_form_id FOREIGN KEY (form_id) REFERENCES clinical_forms(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_responses_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_responses_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medical records (prontuarios)
CREATE TABLE IF NOT EXISTS medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  record_type ENUM('Evolucao','Anamnese','Avaliacao','Encaminhamento','Plano','Relatorio') NOT NULL,
  status ENUM('Rascunho','Finalizado') NOT NULL DEFAULT 'Rascunho',
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NULL,
  tags JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_medical_records_tenant_id (tenant_id),
  KEY idx_medical_records_patient_id (patient_id),
  CONSTRAINT fk_medical_records_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_medical_records_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_medical_records_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medical_record_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  file_type VARCHAR(50) NULL,
  file_size INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_record_attachments_record_id (record_id),
  CONSTRAINT fk_record_attachments_record_id FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  size VARCHAR(50) NULL,
  file_url VARCHAR(1024) NOT NULL,
  uploaded_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_documents_tenant_id (tenant_id),
  KEY idx_documents_uploaded_by (uploaded_by),
  CONSTRAINT fk_documents_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  brand VARCHAR(100) NULL,
  sales_count INT NOT NULL DEFAULT 0,
  type ENUM('physical','digital') NOT NULL DEFAULT 'physical',
  image_url VARCHAR(1024) NULL,
  expiration_date DATE NULL,
  barcode VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_products_tenant_id (tenant_id),
  CONSTRAINT fk_products_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  code VARCHAR(100) PRIMARY KEY,
  module VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('super_admin','admin','secretario','profissional') NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_role_permissions_role (role),
  KEY idx_role_permissions_permission (permission_code),
  CONSTRAINT fk_role_permissions_permission_code FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  granted TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_permissions_user_id (user_id),
  KEY idx_user_permissions_permission_code (permission_code),
  CONSTRAINT fk_user_permissions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_permission_code FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT PRIMARY KEY,
  language VARCHAR(10) NULL,
  timezone VARCHAR(50) NULL,
  theme VARCHAR(50) NULL,
  notifications JSON NULL,
  integrations JSON NULL,
  ui_state JSON NULL,
  preferences JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages
CREATE TABLE IF NOT EXISTS message_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  is_global TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_message_templates_tenant_id (tenant_id),
  CONSTRAINT fk_message_templates_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  channel ENUM('whatsapp','sms','email') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_message_logs_tenant_id (tenant_id),
  CONSTRAINT fk_message_logs_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications / reminders
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id INT PRIMARY KEY,
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
  push_enabled TINYINT(1) NOT NULL DEFAULT 1,
  reminder_minutes INT NOT NULL DEFAULT 60,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_settings_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  appointment_id INT NOT NULL,
  channel ENUM('whatsapp','sms','email','push') NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('scheduled','sent','cancelled','failed') NOT NULL DEFAULT 'scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appointment_reminders_tenant_id (tenant_id),
  KEY idx_appointment_reminders_appointment_id (appointment_id),
  CONSTRAINT fk_appointment_reminders_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment_reminders_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploads
CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  owner_user_id INT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024) NULL,
  file_type VARCHAR(50) NULL,
  file_size INT NULL,
  status ENUM('pending','uploaded','failed') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_uploads_tenant_id (tenant_id),
  KEY idx_uploads_owner_user_id (owner_user_id),
  CONSTRAINT fk_uploads_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_uploads_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Public booking
CREATE TABLE IF NOT EXISTS public_booking_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  settings JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_public_booking_profiles_slug (slug),
  KEY idx_public_booking_profiles_tenant_id (tenant_id),
  CONSTRAINT fk_public_booking_profiles_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS public_booking_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  patient_email VARCHAR(255) NULL,
  patient_phone VARCHAR(50) NULL,
  preferred_date DATETIME NULL,
  notes TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_public_booking_requests_profile_id (profile_id),
  CONSTRAINT fk_public_booking_requests_profile_id FOREIGN KEY (profile_id) REFERENCES public_booking_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Neuro / PEI
CREATE TABLE IF NOT EXISTS pei_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  creator_user_id INT NULL,
  start_date DATE NOT NULL,
  review_date DATE NULL,
  status ENUM('active','paused','completed') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pei_plans_tenant_id (tenant_id),
  KEY idx_pei_plans_patient_id (patient_id),
  CONSTRAINT fk_pei_plans_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_pei_plans_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_pei_plans_creator_user_id FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pei_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pei_id INT NOT NULL,
  area VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('acquisition','maintenance','generalization','completed') NOT NULL DEFAULT 'acquisition',
  current_value INT NOT NULL DEFAULT 0,
  target_value INT NOT NULL DEFAULT 100,
  start_date DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pei_goals_pei_id (pei_id),
  CONSTRAINT fk_pei_goals_pei_id FOREIGN KEY (pei_id) REFERENCES pei_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pei_goal_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_id INT NOT NULL,
  value INT NOT NULL,
  recorded_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pei_goal_history_goal_id (goal_id),
  CONSTRAINT fk_pei_goal_history_goal_id FOREIGN KEY (goal_id) REFERENCES pei_goals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pei_abc_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pei_id INT NOT NULL,
  record_date DATETIME NOT NULL,
  antecedent TEXT NOT NULL,
  behavior TEXT NOT NULL,
  consequence TEXT NULL,
  intensity ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  duration VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pei_abc_records_pei_id (pei_id),
  CONSTRAINT fk_pei_abc_records_pei_id FOREIGN KEY (pei_id) REFERENCES pei_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pei_sensory_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pei_id INT NOT NULL,
  auditory INT NOT NULL DEFAULT 50,
  visual INT NOT NULL DEFAULT 50,
  tactile INT NOT NULL DEFAULT 50,
  vestibular INT NOT NULL DEFAULT 50,
  oral INT NOT NULL DEFAULT 50,
  social INT NOT NULL DEFAULT 50,
  proprioceptive INT NOT NULL DEFAULT 50,
  last_assessment_date DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pei_sensory_profiles (pei_id),
  CONSTRAINT fk_pei_sensory_profiles_pei_id FOREIGN KEY (pei_id) REFERENCES pei_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS neuro_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assessment_type ENUM('risk','sum') NOT NULL DEFAULT 'sum',
  cutoff DECIMAL(10,2) NULL,
  questions_json JSON NULL,
  options_json JSON NULL,
  color VARCHAR(32) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_neuro_assessments_tenant_id (tenant_id),
  CONSTRAINT fk_neuro_assessments_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS neuro_assessment_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  patient_id INT NOT NULL,
  assessment_id INT NOT NULL,
  score DECIMAL(10,2) NULL,
  answers_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_neuro_assessment_results_tenant_id (tenant_id),
  KEY idx_neuro_assessment_results_patient_id (patient_id),
  KEY idx_neuro_assessment_results_assessment_id (assessment_id),
  CONSTRAINT fk_neuro_assessment_results_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_neuro_assessment_results_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_neuro_assessment_results_assessment_id FOREIGN KEY (assessment_id) REFERENCES neuro_assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Document generator
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
