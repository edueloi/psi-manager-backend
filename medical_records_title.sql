-- Add title/content/tags to medical_records if missing
ALTER TABLE medical_records
  ADD COLUMN title VARCHAR(255) NOT NULL AFTER status,
  ADD COLUMN content LONGTEXT NULL AFTER title,
  ADD COLUMN tags JSON NULL AFTER content;
