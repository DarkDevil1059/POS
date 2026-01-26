/*
  # Fix discount_amount column schema cache issue

  1. Changes
    - Ensure discount_amount column exists in sales table
    - Force schema cache refresh by making a harmless schema change
    - Add proper constraints and default values
    - Verify column definition is correct

  2. Security
    - Maintains existing RLS policies
    - No changes to security settings
*/

-- Ensure the discount_amount column exists with proper definition
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'discount_amount'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE public.sales ADD COLUMN discount_amount numeric(10,2) NOT NULL DEFAULT 0.00;
  ELSE
    -- If it exists, ensure it has the correct type and constraints
    ALTER TABLE public.sales ALTER COLUMN discount_amount SET DATA TYPE numeric(10,2);
    ALTER TABLE public.sales ALTER COLUMN discount_amount SET NOT NULL;
    ALTER TABLE public.sales ALTER COLUMN discount_amount SET DEFAULT 0.00;
  END IF;
END $$;

-- Ensure all existing records have proper values
UPDATE public.sales SET discount_amount = 0.00 WHERE discount_amount IS NULL;

-- Force schema cache refresh by adding a harmless comment
COMMENT ON COLUMN public.sales.discount_amount IS 'Discount amount applied to this sale in currency units - updated';

-- Remove the comment to complete the cache refresh cycle
COMMENT ON COLUMN public.sales.discount_amount IS NULL;

-- Add the final comment
COMMENT ON COLUMN public.sales.discount_amount IS 'Discount amount applied to this sale in currency units';