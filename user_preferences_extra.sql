-- Add extra preference fields
ALTER TABLE user_preferences
  ADD COLUMN notifications JSON NULL,
  ADD COLUMN integrations JSON NULL,
  ADD COLUMN ui_state JSON NULL,
  ADD COLUMN preferences JSON NULL;
