/*
  # Create Settings Table for Dynamic Branding

  1. New Table
    - `settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `shop_name` (text)
      - `shop_logo_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on settings table
    - Add policy for users to manage their own settings
    - Each user can only access their own settings

  3. Performance
    - Add index on user_id for better query performance
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name text NOT NULL DEFAULT 'POS System',
  shop_logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy for user isolation
CREATE POLICY "Users can manage their own settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Create unique constraint to ensure one settings record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_id_unique ON settings(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();