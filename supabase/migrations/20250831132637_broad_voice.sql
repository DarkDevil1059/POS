/*
  # Fix Missing User ID Columns - Final Resolution

  1. Changes
    - Add missing user_id columns to all tables
    - Force complete schema refresh
    - Ensure proper data types and constraints
    - Update RLS policies for user isolation

  2. Tables Updated
    - customers: add user_id column
    - services: add user_id column
    - sales: add user_id column
    - staff: add owner_user_id column

  3. Security
    - Enable RLS on all tables
    - Create strict user isolation policies
    - Add performance indexes
*/

-- Force schema refresh by temporarily disabling RLS
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff DISABLE ROW LEVEL SECURITY;

-- Add user_id column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add owner_user_id column to staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure discount_amount column exists in sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;

-- Re-enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;

DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

-- Create comprehensive policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create comprehensive policies for services
CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create comprehensive policies for sales
CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create comprehensive policies for staff
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

-- Force a complete schema cache refresh
NOTIFY pgrst, 'reload schema';