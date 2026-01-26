/*
  # Expand Settings Table

  1. Changes
    - Add business information fields (address, contact_number, email)
    - Add billing & receipt settings (receipt_footer, auto_print, show_customer_details, show_staff_name)
    - Add appearance settings (theme_style, primary_color, accent_color, font_style, layout_density, blur_intensity)
    - Add security settings (enable_pin, session_timeout)

  2. Fields Added
    - `address` (text) - Business address
    - `contact_number` (text) - Business phone number
    - `email` (text) - Business email
    - `receipt_footer` (text) - Footer message on receipts
    - `auto_print` (boolean) - Auto print receipts after sale
    - `show_customer_details` (boolean) - Show customer info on receipt
    - `show_staff_name` (boolean) - Show staff name on receipt
    - `theme_style` (text) - UI theme: light/dark/glass
    - `primary_color` (text) - Primary color hex code
    - `accent_color` (text) - Accent color hex code
    - `font_style` (text) - Font style: default/rounded/bold
    - `layout_density` (text) - Layout: compact/comfortable
    - `blur_intensity` (integer) - Glass mode blur intensity 0-100
    - `enable_pin` (boolean) - Require PIN for POS access
    - `session_timeout` (integer) - Session timeout in minutes
*/

-- Add business information fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'address'
  ) THEN
    ALTER TABLE settings ADD COLUMN address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'contact_number'
  ) THEN
    ALTER TABLE settings ADD COLUMN contact_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'email'
  ) THEN
    ALTER TABLE settings ADD COLUMN email text DEFAULT '';
  END IF;
END $$;

-- Add billing & receipt settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'receipt_footer'
  ) THEN
    ALTER TABLE settings ADD COLUMN receipt_footer text DEFAULT 'Thank you for your business!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'auto_print'
  ) THEN
    ALTER TABLE settings ADD COLUMN auto_print boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_customer_details'
  ) THEN
    ALTER TABLE settings ADD COLUMN show_customer_details boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_staff_name'
  ) THEN
    ALTER TABLE settings ADD COLUMN show_staff_name boolean DEFAULT true;
  END IF;
END $$;

-- Add appearance settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'theme_style'
  ) THEN
    ALTER TABLE settings ADD COLUMN theme_style text DEFAULT 'light';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE settings ADD COLUMN primary_color text DEFAULT '#10b981';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'accent_color'
  ) THEN
    ALTER TABLE settings ADD COLUMN accent_color text DEFAULT '#3b82f6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'font_style'
  ) THEN
    ALTER TABLE settings ADD COLUMN font_style text DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'layout_density'
  ) THEN
    ALTER TABLE settings ADD COLUMN layout_density text DEFAULT 'comfortable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'blur_intensity'
  ) THEN
    ALTER TABLE settings ADD COLUMN blur_intensity integer DEFAULT 50;
  END IF;
END $$;

-- Add security settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'enable_pin'
  ) THEN
    ALTER TABLE settings ADD COLUMN enable_pin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'session_timeout'
  ) THEN
    ALTER TABLE settings ADD COLUMN session_timeout integer DEFAULT 30;
  END IF;
END $$;
