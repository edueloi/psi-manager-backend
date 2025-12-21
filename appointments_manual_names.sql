-- Allow manual patient/professional names and optional professional
ALTER TABLE appointments
  MODIFY COLUMN psychologist_id INT NULL,
  ADD COLUMN patient_name_text VARCHAR(255) NULL AFTER patient_id,
  ADD COLUMN professional_name_text VARCHAR(255) NULL AFTER psychologist_id;
