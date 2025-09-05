/*
  # Add payment_mode column to sales table

  1. Changes
    - Add `payment_mode` column to `sales` table
    - Default value: 'cash'
    - Allow tracking payment method for each sale

  2. Security
    - No changes to existing RLS policies
    - New column inherits existing security settings
*/

-- Add payment_mode column to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'payment_mode'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN payment_mode text DEFAULT 'cash';
  END IF;
END $$;

-- Update existing records to have default payment mode
UPDATE public.sales SET payment_mode = 'cash' WHERE payment_mode IS NULL;