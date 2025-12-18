-- Add recurrence support to appointments
ALTER TABLE appointments
  ADD COLUMN meeting_url VARCHAR(1024) NULL,
  ADD COLUMN recurrence_rule JSON NULL,
  ADD COLUMN recurrence_end_date DATE NULL,
  ADD COLUMN recurrence_count INT NULL,
  ADD COLUMN parent_appointment_id INT NULL,
  ADD COLUMN recurrence_index INT NULL;

ALTER TABLE appointments
  ADD KEY idx_appointments_parent_id (parent_appointment_id);

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_parent_id
  FOREIGN KEY (parent_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
