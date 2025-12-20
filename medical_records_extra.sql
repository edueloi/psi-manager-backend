-- Extend medical_records record_type and attachments metadata
ALTER TABLE medical_records
  MODIFY COLUMN record_type ENUM('Evolucao','Anamnese','Avaliacao','Encaminhamento','Plano','Relatorio') NOT NULL;

ALTER TABLE medical_record_attachments
  ADD COLUMN file_type VARCHAR(50) NULL AFTER file_url,
  ADD COLUMN file_size INT NULL AFTER file_type;
