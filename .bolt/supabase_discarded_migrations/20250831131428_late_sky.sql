/*
  # Fix user_id columns and schema cache issues

  1. Changes
    - Ensure all tables have proper user_id columns
    - Force schema cache refresh
    - Add proper constraints and indexes
    - Update RLS policies for multi-tenant isolation

  2. Tables Updated
    - customers: user_id column
    - services: user_id column  
    - sales: user_id column
    - staff: owner_user_id column (staff already has user_id for different purpose)

  3. Security
    - Update RLS policies for strict user isolation
    - Each user can only access their own data
*/

-- Ensure user_id column exists in customers table
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

-- Ensure user_id column exists in services table
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

-- Ensure user_id column exists in sales table
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

-- Ensure owner_user_id column exists in staff table (staff already has user_id for different purpose)
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

-- Force schema cache refresh by updating table comments
COMMENT ON TABLE public.customers IS 'Customer records with user isolation - updated';
COMMENT ON TABLE public.services IS 'Service records with user isolation - updated';
COMMENT ON TABLE public.sales IS 'Sales records with user isolation - updated';
COMMENT ON TABLE public.staff IS 'Staff records with user isolation - updated';

-- Remove comments to complete cache refresh
COMMENT ON TABLE public.customers IS NULL;
COMMENT ON TABLE public.services IS NULL;
COMMENT ON TABLE public.sales IS NULL;
COMMENT ON TABLE public.staff IS NULL;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;

DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;

-- Create new user-isolated policies for customers
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- Create new user-isolated policies for staff
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

-- Add final comments for clarity
COMMENT ON COLUMN public.customers.user_id IS 'References the user who owns this customer record';
COMMENT ON COLUMN public.services.user_id IS 'References the user who owns this service';
COMMENT ON COLUMN public.sales.user_id IS 'References the user who owns this sale record';
COMMENT ON COLUMN public.staff.owner_user_id IS 'References the user who owns this staff member';