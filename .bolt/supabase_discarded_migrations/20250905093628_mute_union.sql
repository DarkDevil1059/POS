/*
  # Fix missing payment_mode column in sales table

  1. Changes
    - Ensure `payment_mode` column exists in `sales` table
    - Set default value to 'cash' for consistency
    - Update any existing NULL values to 'cash'

  2. Security
    - No changes to existing RLS policies
    - Column inherits existing security settings
*/

-- Add payment_mode column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'payment_mode'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN payment_mode text DEFAULT 'cash';
    
    -- Update any existing records to have default payment mode
    UPDATE public.sales SET payment_mode = 'cash' WHERE payment_mode IS NULL;
    
    -- Add a comment for documentation
    COMMENT ON COLUMN public.sales.payment_mode IS 'Payment method used for the sale (cash, card, upi, etc.)';
  END IF;
END $$;