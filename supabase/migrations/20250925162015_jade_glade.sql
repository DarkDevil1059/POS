/*
  # Fix Settings RLS Policies - Final Fix

  This migration ensures proper RLS policies for the settings table that allow
  both INSERT and UPDATE operations for authenticated users.
*/

-- Drop all existing policies on settings table
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings - SELECT" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings - INSERT" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings - UPDATE" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings - DELETE" ON settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Allow all inserts" ON settings;

-- Ensure RLS is enabled
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for settings table
CREATE POLICY "settings_select_policy" ON settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "settings_insert_policy" ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_update_policy" ON settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_delete_policy" ON settings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure the settings table has proper constraints
DO $$
BEGIN
  -- Add unique constraint on user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'settings_user_id_unique'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT settings_user_id_unique UNIQUE (user_id);
  END IF;
END $$;