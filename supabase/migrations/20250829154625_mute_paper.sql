/*
  # Create POS System Database Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `contact` (text, optional)
      - `created_at` (timestamp)
    - `staff`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `user_id` (uuid, optional, references auth.users)
      - `created_at` (timestamp)
    - `services`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `price` (numeric, required)
      - `created_at` (timestamp)
    - `sales`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `staff_id` (uuid, references staff)
      - `service_id` (uuid, references services)
      - `date` (timestamp, required)
      - `total` (numeric, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage all data
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  created_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  staff_id uuid REFERENCES staff(id),
  service_id uuid REFERENCES services(id),
  date timestamptz NOT NULL DEFAULT now(),
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Authenticated users can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for staff
CREATE POLICY "Authenticated users can manage staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for services
CREATE POLICY "Authenticated users can manage services"
  ON services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for sales
CREATE POLICY "Authenticated users can manage sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO customers (name, contact) VALUES 
  ('John Doe', 'john@example.com'),
  ('Jane Smith', '555-0123'),
  ('Bob Johnson', 'bob@company.com')
ON CONFLICT DO NOTHING;

INSERT INTO staff (name) VALUES 
  ('Alice Manager'),
  ('Bob Technician'),
  ('Carol Assistant')
ON CONFLICT DO NOTHING;

INSERT INTO services (name, price) VALUES 
  ('Haircut', 25.00),
  ('Hair Wash', 15.00),
  ('Styling', 35.00),
  ('Color Treatment', 75.00)
ON CONFLICT DO NOTHING;