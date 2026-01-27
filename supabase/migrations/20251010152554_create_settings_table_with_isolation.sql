/*
  # Create Settings Table with User Isolation

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique, required) - Owner of the settings
      - `shop_name` (text) - Business name
      - `shop_logo_url` (text) - URL to business logo
      - `address` (text) - Business address
      - `contact_number` (text) - Business phone number
      - `receipt_footer` (text) - Footer message on receipts
      - `auto_print` (boolean) - Auto print receipts after sale
      - `show_customer_details` (boolean) - Show customer info on receipt
      - `show_logo` (boolean) - Show logo on receipt
      - `show_shop_name` (boolean) - Show shop name on receipt
      - `session_timeout` (integer) - Session timeout in minutes
      - `admin_password_hash` (text, nullable) - User-specific admin password hash. If NULL, falls back to login password
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on settings table
    - Add restrictive policies: users can only read/write their own settings
    - Each policy checks that auth.uid() = user_id
    
  CRITICAL: Settings are isolated per user account. Each user has their own
  business settings that are completely separate from other users.
*/

-- Create settings table with user_id
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  shop_name text NOT NULL DEFAULT 'POS System',
  shop_logo_url text,
  address text DEFAULT '',
  contact_number text DEFAULT '',
  receipt_footer text DEFAULT 'Thank you for your business!',
  auto_print boolean DEFAULT false,
  show_customer_details boolean DEFAULT true,
  show_logo boolean DEFAULT true,
  show_shop_name boolean DEFAULT true,
  session_timeout integer DEFAULT 30,
  admin_password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies for settings
CREATE POLICY "Users can view own settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);