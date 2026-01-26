/*
  # Ensure discount_amount column exists and fix schema cache

  1. Changes
    - Force refresh of schema cache by dropping and recreating the column if needed
    - Ensure proper column definition with correct data type
    - Add proper constraints and default values

  2. Security
    - Maintains existing RLS policies
    - No changes to security settings
*/

-- First, let's check and handle the discount_amount column properly
DO $$
BEGIN
  -- Check if column exists and drop it if it does (to recreate with proper definition)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'discount_amount'
  ) THEN
    -- Store existing data temporarily
    ALTER TABLE public.sales RENAME COLUMN discount_amount TO discount_amount_temp;
  END IF;
  
  -- Add the column with proper definition
  ALTER TABLE public.sales ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;
  
  -- If we had existing data, copy it back
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'discount_amount_temp'
  ) THEN
    UPDATE public.sales SET discount_amount = COALESCE(discount_amount_temp, 0.00);
    ALTER TABLE public.sales DROP COLUMN discount_amount_temp;
  END IF;
END $$;

-- Ensure all existing records have proper values
UPDATE public.sales SET discount_amount = 0.00 WHERE discount_amount IS NULL;

-- Add a comment to the column for clarity
COMMENT ON COLUMN public.sales.discount_amount IS 'Discount amount applied to this sale in currency units';