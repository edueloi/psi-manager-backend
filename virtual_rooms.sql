-- Criação da tabela de salas virtuais
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
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (creator_user_id) REFERENCES users(id)
);