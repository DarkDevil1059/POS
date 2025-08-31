/*
  # Fix Missing User ID Columns - Final Resolution

  1. New Columns
    - Add `user_id` to customers table if missing
    - Add `user_id` to services table if missing  
    - Add `user_id` to sales table if missing
    - Add `owner_user_id` to staff table if missing
    - Ensure `discount_amount` exists in sales table

  2. Security
    - Enable RLS on all tables
    - Create policies for user data isolation
    - Each user can only access their own data

  3. Performance
    - Add indexes for user_id columns
    - Force schema cache refresh
*/

-- First, ensure all tables exist (safety check)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  staff_id uuid REFERENCES staff(id),
  service_id uuid REFERENCES services(id),
  date timestamptz NOT NULL DEFAULT now(),
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add user_id column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add owner_user_id column to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure discount_amount column exists in sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to prevent conflicts
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;

DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

-- Create user-isolated policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user-isolated policies for services
CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user-isolated policies for sales
CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user-isolated policies for staff
CREATE POLICY "Users can manage their own staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_owner_user_id ON staff(owner_user_id);

-- Force schema cache refresh using multiple methods
NOTIFY pgrst, 'reload schema';

-- Additional cache refresh by updating system catalog
SELECT pg_notify('pgrst', 'reload schema');

-- Update table statistics to force cache refresh
ANALYZE customers;
ANALYZE services;
ANALYZE sales;
ANALYZE staff;