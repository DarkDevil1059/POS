/*
  # Create POS System Database Schema with User Isolation

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, required) - Owner of the customer record
      - `name` (text, required)
      - `contact` (text, optional)
      - `created_at` (timestamp)
    - `staff`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, required) - Owner of the staff record
      - `name` (text, required)
      - `created_at` (timestamp)
    - `services`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, required) - Owner of the service
      - `name` (text, required)
      - `price` (numeric, required)
      - `created_at` (timestamp)
    - `sales`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, required) - Owner of the sale
      - `customer_id` (uuid, references customers)
      - `staff_id` (uuid, references staff)
      - `service_id` (uuid, references services)
      - `payment_mode` (text) - Payment mode used
      - `discount_amount` (numeric) - Discount applied
      - `date` (timestamp, required)
      - `total` (numeric, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add restrictive policies: users can only access their own data
    - Each policy checks that auth.uid() = user_id
    
  CRITICAL: All data is isolated per user account. Users can ONLY see and manage
  their own customers, staff, services, and sales records.
*/

-- Create customers table with user_id
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create staff table with user_id
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create services table with user_id
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sales table with user_id
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  payment_mode text DEFAULT 'cash',
  discount_amount numeric(10,2) DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies for customers
CREATE POLICY "Users can view own customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create restrictive policies for staff
CREATE POLICY "Users can view own staff"
  ON staff
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own staff"
  ON staff
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staff"
  ON staff
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own staff"
  ON staff
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create restrictive policies for services
CREATE POLICY "Users can view own services"
  ON services
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create restrictive policies for sales
CREATE POLICY "Users can view own sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales"
  ON sales
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales"
  ON sales
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);