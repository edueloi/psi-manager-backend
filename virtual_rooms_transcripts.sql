/* =========================================================
   MIGRATION: virtual_room_transcripts
   Compatible with MySQL 5.7+ and 8.0+
   ========================================================= */

CREATE TABLE IF NOT EXISTS virtual_room_transcripts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  speaker_role ENUM('host','guest') NOT NULL,
  speaker_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_virtual_room_transcripts_room_id (room_id),
  KEY idx_virtual_room_transcripts_tenant_id (tenant_id),
  CONSTRAINT fk_virtual_room_transcripts_room_id FOREIGN KEY (room_id) REFERENCES virtual_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_room_transcripts_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
