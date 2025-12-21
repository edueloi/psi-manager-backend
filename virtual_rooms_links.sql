-- Add patient/professional/appointment linkage to virtual rooms
ALTER TABLE virtual_rooms
  ADD COLUMN patient_id INT NULL AFTER scheduled_end,
  ADD COLUMN professional_id INT NULL AFTER patient_id,
  ADD COLUMN appointment_id INT NULL AFTER professional_id,
  ADD COLUMN provider ENUM('jitsi','zoom','teams','outro') NULL DEFAULT 'jitsi' AFTER appointment_id,
  ADD COLUMN link VARCHAR(1024) NULL AFTER provider,
  ADD COLUMN expiration_date DATETIME NULL AFTER link,
  ADD KEY idx_virtual_rooms_patient_id (patient_id),
  ADD KEY idx_virtual_rooms_professional_id (professional_id),
  ADD KEY idx_virtual_rooms_appointment_id (appointment_id),
  ADD CONSTRAINT fk_virtual_rooms_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_virtual_rooms_professional_id FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_virtual_rooms_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
