-- Add details_json to case study cards (MySQL 8)
ALTER TABLE case_study_cards
  ADD COLUMN details_json JSON NULL AFTER tags_json;
