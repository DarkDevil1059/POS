/*
  # Add Admin Password to Settings Table

  1. Changes to Settings Table
    - Add `admin_password_hash` (text, nullable) - Stores hashed admin password
    - If null, admin password defaults to user's login password

  2. Notes
    - Each user has their own admin password
    - If no custom admin password is set, the system will use the user's login password
    - Passwords should be hashed before storage (handled in application layer)
*/

-- Add admin_password_hash column to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'admin_password_hash'
  ) THEN
    ALTER TABLE settings ADD COLUMN admin_password_hash text;
  END IF;
END $$;
