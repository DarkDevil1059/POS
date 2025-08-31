/*
  # Fix Missing User ID Columns

  1. Changes
    - Add user_id columns to customers, services, and sales tables
    - Add owner_user_id column to staff table
    - Ensure all columns have proper constraints and references
    - Update RLS policies for proper user isolation

  2. Tables Updated
    - customers: add user_id column with foreign key to auth.users
    - services: add user_id column with foreign key to auth.users
    - sales: add user_id column with foreign key to auth.users
    - staff: add owner_user_id column with foreign key to auth.users

  3. Security
    - Enable RLS on all tables
    - Create policies for user data isolation
    - Add performance indexes
*/

-- Add user_id column to customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to services table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE services ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add owner_user_id column to staff table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure discount_amount column exists in sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

-- Create policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for services
CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for sales
CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for staff
CREATE POLICY "Users can manage their own staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_owner_user_id ON staff(owner_user_id);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';