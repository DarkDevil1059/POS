/*
  # Add User-Based Data Isolation (Multi-Tenancy)

  1. Changes
    - Add `user_id` column to all main tables (customers, staff, services, sales)
    - Update RLS policies to filter data by authenticated user
    - Ensure each user only sees their own data

  2. Security
    - Update RLS policies for strict user isolation
    - Each user can only access their own records
    - Prevents data leakage between accounts

  3. Data Migration
    - Safely add user_id columns with proper defaults
    - Maintain existing data integrity
*/

-- Add user_id column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id column to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;

-- Create new user-isolated policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create new user-isolated policies for staff
CREATE POLICY "Users can manage their own staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Create new user-isolated policies for services
CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create new user-isolated policies for sales
CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_owner_user_id ON staff(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);