/*
  # Add discount_amount column to sales table

  1. Changes
    - Add `discount_amount` column to `sales` table
      - Type: decimal(10,2) for currency values
      - Default: 0.00 (no discount by default)
      - Not null constraint to ensure data consistency

  2. Notes
    - This resolves the schema cache error where the application expects a discount_amount column
    - Default value ensures existing sales records remain valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_amount decimal(10,2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;