/*
  # Create Admin Password Table

  1. New Tables
    - `admin_passwords`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique, required) - Owner of the admin password
      - `password_hash` (text, required) - Hashed admin password
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on admin_passwords table
    - Add restrictive policies: users can only access their own admin password
    - Each policy checks that auth.uid() = user_id
    
  CRITICAL: Each user has their own admin password for sensitive operations.
*/

CREATE TABLE IF NOT EXISTS admin_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own admin password"
  ON admin_passwords
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own admin password"
  ON admin_passwords
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own admin password"
  ON admin_passwords
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own admin password"
  ON admin_passwords
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);