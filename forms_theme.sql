/* =========================================================
   MIGRATION: clinical_forms.theme_json
   Compatible with MySQL 5.7+ and 8.0+
   ========================================================= */

ALTER TABLE clinical_forms
  ADD COLUMN theme_json JSON NULL AFTER response_count;
