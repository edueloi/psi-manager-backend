-- Add status to medical_records
ALTER TABLE medical_records
  ADD COLUMN status ENUM('Rascunho','Finalizado') NOT NULL DEFAULT 'Rascunho' AFTER record_type;
