/*
  # Remove Unused Appearance Columns

  1. Changes
    - Drop font_style column (no longer used)
    - Drop layout_density column (no longer used)

  2. Notes
    - These columns were removed from the UI
    - Simplifying the settings schema
*/

-- Remove unused columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'font_style'
  ) THEN
    ALTER TABLE settings DROP COLUMN font_style;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'layout_density'
  ) THEN
    ALTER TABLE settings DROP COLUMN layout_density;
  END IF;
END $$;