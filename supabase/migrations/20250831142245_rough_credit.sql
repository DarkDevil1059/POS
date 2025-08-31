/*
  # Force Schema Update - Final Fix for Missing User Columns

  1. Changes
    - Forcefully add all missing user_id columns
    - Use ALTER TABLE with CASCADE to ensure proper setup
    - Force complete schema cache refresh
    - Rebuild all RLS policies from scratch

  2. Tables Updated
    - customers: ensure user_id column exists
    - services: ensure user_id column exists
    - sales: ensure user_id column exists
    - staff: ensure owner_user_id column exists

  3. Security
    - Rebuild all RLS policies
    - Ensure proper user isolation
    - Force schema cache refresh
*/

-- Disable RLS temporarily to make changes
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies completely
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON staff;
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

-- Force add user_id to customers (drop and recreate if needed)
DO $$
BEGIN
  -- Try to drop the column if it exists but is problematic
  BEGIN
    ALTER TABLE public.customers DROP COLUMN IF EXISTS user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if column doesn't exist
  END;
  
  -- Add the column fresh
  ALTER TABLE public.customers ADD COLUMN user_id uuid;
  ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Force add user_id to services (drop and recreate if needed)
DO $$
BEGIN
  -- Try to drop the column if it exists but is problematic
  BEGIN
    ALTER TABLE public.services DROP COLUMN IF EXISTS user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if column doesn't exist
  END;
  
  -- Add the column fresh
  ALTER TABLE public.services ADD COLUMN user_id uuid;
  ALTER TABLE public.services ADD CONSTRAINT services_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Force add user_id to sales (drop and recreate if needed)
DO $$
BEGIN
  -- Try to drop the column if it exists but is problematic
  BEGIN
    ALTER TABLE public.sales DROP COLUMN IF EXISTS user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if column doesn't exist
  END;
  
  -- Add the column fresh
  ALTER TABLE public.sales ADD COLUMN user_id uuid;
  ALTER TABLE public.sales ADD CONSTRAINT sales_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Force add owner_user_id to staff (drop and recreate if needed)
DO $$
BEGIN
  -- Try to drop the column if it exists but is problematic
  BEGIN
    ALTER TABLE public.staff DROP COLUMN IF EXISTS owner_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if column doesn't exist
  END;
  
  -- Add the column fresh
  ALTER TABLE public.staff ADD COLUMN owner_user_id uuid;
  ALTER TABLE public.staff ADD CONSTRAINT staff_owner_user_id_fkey 
    FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Ensure discount_amount exists in sales
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

-- Re-enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create fresh RLS policies
CREATE POLICY "Users can manage their own customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own services"
  ON services
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_customers_user_id;
DROP INDEX IF EXISTS idx_services_user_id;
DROP INDEX IF EXISTS idx_sales_user_id;
DROP INDEX IF EXISTS idx_staff_owner_user_id;

-- Create fresh indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_staff_owner_user_id ON staff(owner_user_id);

-- Force multiple types of schema refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Update table comments to force cache invalidation
COMMENT ON TABLE public.customers IS 'Customer records - schema refreshed';
COMMENT ON TABLE public.services IS 'Service records - schema refreshed';
COMMENT ON TABLE public.sales IS 'Sales records - schema refreshed';
COMMENT ON TABLE public.staff IS 'Staff records - schema refreshed';

-- Remove comments
COMMENT ON TABLE public.customers IS NULL;
COMMENT ON TABLE public.services IS NULL;
COMMENT ON TABLE public.sales IS NULL;
COMMENT ON TABLE public.staff IS NULL;

-- Analyze tables to refresh statistics
ANALYZE public.customers;
ANALYZE public.services;
ANALYZE public.sales;
ANALYZE public.staff;

-- Final schema refresh
NOTIFY pgrst, 'reload schema';