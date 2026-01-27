/*
  # Remove Admin Password from Settings Table

  1. Changes
    - Drop `admin_password_hash` column from settings table
    
  2. Notes
    - Admin password will be moved to a separate onboarding flow
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'admin_password_hash'
  ) THEN
    ALTER TABLE settings DROP COLUMN admin_password_hash;
  END IF;
END $$;