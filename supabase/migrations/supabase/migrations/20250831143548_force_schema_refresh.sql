/*
  # Force Schema Update - Fix Missing Columns
*/

-- Ensure user_id exists in customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure user_id exists in services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE services ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure user_id exists in sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure owner_user_id exists in staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE staff ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add discount_amount if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- Force schema cache refresh
COMMENT ON TABLE public.customers IS 'tmp schema refresh';
COMMENT ON TABLE public.customers IS NULL;

-- Re-enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop + recreate RLS policies (safety)
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
DROP POLICY IF EXISTS "Users can manage their own staff" ON staff;

CREATE POLICY "Users can manage their own customers"
  ON customers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own services"
  ON services FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sales"
  ON sales FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own staff"
  ON staff FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

-- Tell PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
