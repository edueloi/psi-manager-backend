/* =========================================================
   MIGRATION: virtual_room_waiting
   Compatible with MySQL 5.7+ and 8.0+
   ========================================================= */

CREATE TABLE IF NOT EXISTS virtual_room_waiting (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  status ENUM('waiting','approved','denied') NOT NULL DEFAULT 'waiting',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_virtual_room_waiting_room_id (room_id),
  KEY idx_virtual_room_waiting_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_waiting_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_waiting_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
