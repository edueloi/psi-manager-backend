/* =========================================================
   MIGRATION: virtual room realtime (participants, messages, events, assessments)
   Compatible with MySQL 5.7+ and 8.0+
   ========================================================= */

CREATE TABLE IF NOT EXISTS virtual_room_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  role ENUM('host','guest') NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NULL UNIQUE,
  status ENUM('joined','left') NOT NULL DEFAULT 'joined',
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_virtual_room_participants_room_id (room_id),
  KEY idx_virtual_room_participants_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_participants_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_participants_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS virtual_room_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  sender_role ENUM('host','guest','system') NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_virtual_room_messages_room_id (room_id),
  KEY idx_virtual_room_messages_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_messages_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_messages_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS virtual_room_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  payload_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_virtual_room_events_room_id (room_id),
  KEY idx_virtual_room_events_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_events_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_events_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS virtual_room_assessment_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  event_type ENUM('start','answer','finish') NOT NULL,
  assessment_id VARCHAR(64) NOT NULL,
  question_id VARCHAR(64) NULL,
  payload_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_virtual_room_assessment_events_room_id (room_id),
  KEY idx_virtual_room_assessment_events_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_assessment_events_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_assessment_events_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
