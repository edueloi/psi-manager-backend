-- Add creator_user_id to medical_records
ALTER TABLE medical_records
  ADD COLUMN creator_user_id INT NULL AFTER patient_id;

ALTER TABLE medical_records
  ADD KEY idx_medical_records_creator_user_id (creator_user_id);

ALTER TABLE medical_records
  ADD CONSTRAINT fk_medical_records_creator_user_id
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL;
