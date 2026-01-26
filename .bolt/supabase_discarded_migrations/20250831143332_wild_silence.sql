/*
  # Fix Missing User ID Columns

  1. Changes
    - Add missing user_id column to services table if it doesn't exist
    - Add missing user_id column to sales table if it doesn't exist
    - Ensure owner_user_id exists in staff table
    - Add proper foreign key constraints
    - Rebuild RLS policies

  2. Tables Updated
    - services: add user_id column with foreign key to auth.users
    - sales: add user_id column with foreign key to auth.users
    - staff: ensure owner_user_id column exists
    - customers: ensure user_id column exists

  3. Security
    - Enable RLS on all tables
    - Create proper user isolation policies
*/

-- Add user_id to services table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN user_id uuid;
    ALTER TABLE public.services ADD CONSTRAINT services_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to sales table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN user_id uuid;
    ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure user_id exists in customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN user_id uuid;
    ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure owner_user_id exists in staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'staff' 
    AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE public.staff ADD COLUMN owner_user_id uuid;
    ALTER TABLE public.staff ADD CONSTRAINT staff_owner_user_id_fkey 
      FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure discount_amount exists in sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

-- Create RLS policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for services
CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for sales
CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for staff
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

-- Force schema refresh
NOTIFY pgrst, 'reload schema';