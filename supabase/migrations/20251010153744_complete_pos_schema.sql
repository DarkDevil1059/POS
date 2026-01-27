/*
  # Complete POS System Database Schema
  
  This migration creates the complete schema for the POS system with proper user isolation.
  
  ## New Tables
  
  ### customers
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, required) - Owner of the customer record
  - `name` (text, required)
  - `contact` (text, optional)
  - `created_at` (timestamp)
  
  ### staff
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, required) - Owner of the staff record
  - `name` (text, required)
  - `created_at` (timestamp)
  
  ### services
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, required) - Owner of the service
  - `name` (text, required)
  - `price` (numeric, required)
  - `created_at` (timestamp)
  
  ### sales
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, required) - Owner of the sale
  - `customer_id` (uuid, references customers)
  - `staff_id` (uuid, references staff)
  - `service_id` (uuid, references services)
  - `payment_mode` (text) - Payment mode used
  - `discount_amount` (numeric) - Discount applied
  - `date` (timestamp, required)
  - `total` (numeric, required)
  - `created_at` (timestamp)
  
  ### settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, unique, required) - Owner of settings
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
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### admin_passwords
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, unique, required) - Owner of the admin password
  - `password_hash` (text, required) - Hashed admin password
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ## Security
  
  All tables have Row Level Security (RLS) enabled with restrictive policies.
  Users can ONLY access their own data - complete data isolation per user.
  
  Each table has policies for SELECT, INSERT, UPDATE, and DELETE that verify:
  - User is authenticated
  - User owns the data (auth.uid() = user_id)
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  payment_mode text DEFAULT 'cash',
  discount_amount numeric(10,2) DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

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
  session_timeout integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_passwords table
CREATE TABLE IF NOT EXISTS admin_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_passwords ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Staff policies
CREATE POLICY "Users can view own staff"
  ON staff FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own staff"
  ON staff FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staff"
  ON staff FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own staff"
  ON staff FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Services policies
CREATE POLICY "Users can view own services"
  ON services FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Sales policies
CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales"
  ON sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales"
  ON sales FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales"
  ON sales FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin passwords policies
CREATE POLICY "Users can view own admin password"
  ON admin_passwords FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own admin password"
  ON admin_passwords FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own admin password"
  ON admin_passwords FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own admin password"
  ON admin_passwords FOR DELETE TO authenticated
  USING (auth.uid() = user_id);