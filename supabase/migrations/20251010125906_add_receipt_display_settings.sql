/*
  # Add Receipt Display Settings

  1. Changes
    - Add show_logo column to control logo display on receipt
    - Add show_shop_name column to control shop name display on receipt
    - Remove show_staff_name column (no longer needed)

  2. Fields Added
    - `show_logo` (boolean) - Show logo on receipt
    - `show_shop_name` (boolean) - Show shop name on receipt
*/

-- Add new fields for receipt display
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_logo'
  ) THEN
    ALTER TABLE settings ADD COLUMN show_logo boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_shop_name'
  ) THEN
    ALTER TABLE settings ADD COLUMN show_shop_name boolean DEFAULT true;
  END IF;
END $$;
