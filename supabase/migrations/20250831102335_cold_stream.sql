/*
  # Fix discount_amount column in sales table

  1. Changes
    - Ensure `discount_amount` column exists in `sales` table
    - Use safe column addition with existence check
    - Set appropriate data type and default value

  2. Notes
    - This migration safely adds the column only if it doesn't exist
    - Resolves schema cache errors in the application
    - Maintains data integrity with proper defaults
*/

-- Safely add discount_amount column if it doesn't exist
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

-- Ensure the column has the correct default value
ALTER TABLE public.sales ALTER COLUMN discount_amount SET DEFAULT 0.00;

-- Update any existing NULL values to 0.00
UPDATE public.sales SET discount_amount = 0.00 WHERE discount_amount IS NULL;

-- Ensure the column is NOT NULL
ALTER TABLE public.sales ALTER COLUMN discount_amount SET NOT NULL;