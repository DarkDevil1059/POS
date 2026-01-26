/*
  # Add discount_amount column to sales table

  1. Changes
    - Add `discount_amount` column to `sales` table with default value 0
    - This allows tracking discounts applied to individual sales
    - Column is nullable to maintain backward compatibility

  2. Security
    - No changes to existing RLS policies
    - New column inherits existing security settings
*/

-- Add discount_amount column to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;