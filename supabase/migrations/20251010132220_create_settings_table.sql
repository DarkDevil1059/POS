/*
  # Create Settings Table

  1. New Tables
    - `settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `shop_name` (text) - Business name
      - `shop_logo_url` (text) - URL to business logo
      - `address` (text) - Business address
      - `contact_number` (text) - Business phone number
      - `receipt_footer` (text) - Footer message on receipts
      - `auto_print` (boolean) - Auto print receipts after sale
      - `show_customer_details` (boolean) - Show customer info on receipt
      - `show_logo` (boolean) - Show logo on receipt
      - `show_shop_name` (boolean) - Show shop name on receipt
      - `theme_style` (text) - UI theme: light/dark/glass
      - `primary_color` (text) - Primary color hex code
      - `accent_color` (text) - Accent color hex code
      - `font_style` (text) - Font style: default/rounded/bold
      - `layout_density` (text) - Layout: compact/comfortable
      - `blur_intensity` (integer) - Glass mode blur intensity 0-100
      - `session_timeout` (integer) - Session timeout in minutes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on settings table
    - Add policy for authenticated users to read/write their own settings
*/

-- Create settings table
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
  theme_style text DEFAULT 'light',
  primary_color text DEFAULT '#10b981',
  accent_color text DEFAULT '#3b82f6',
  font_style text DEFAULT 'default',
  layout_density text DEFAULT 'comfortable',
  blur_intensity integer DEFAULT 50,
  session_timeout integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
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