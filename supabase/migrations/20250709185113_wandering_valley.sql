/*
  # Create transactions and customers tables

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `cpf` (text, unique)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `transactions`
      - `id` (uuid, primary key)
      - `payment_id` (text, unique) - ID from RushPay
      - `customer_id` (uuid, foreign key)
      - `status` (text) - pending, approved, cancelled
      - `payment_method` (text)
      - `total_value` (integer) - value in centavos
      - `pix_code` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read their own data
    - Add service role policies for webhook operations

  3. Functions
    - Function to liberate user access
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  cpf text UNIQUE NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  total_value integer NOT NULL,
  pix_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Users can read own customer data"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage customers"
  ON customers
  FOR ALL
  TO service_role
  USING (true);

-- Policies for transactions
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (customer_id IN (
    SELECT id FROM customers WHERE auth.uid()::text = id::text
  ));

CREATE POLICY "Service role can manage transactions"
  ON transactions
  FOR ALL
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to liberate user access (placeholder - customize as needed)
CREATE OR REPLACE FUNCTION liberar_acesso_ao_usuario(
  user_email text,
  payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the access liberation
  INSERT INTO public.user_access_log (email, payment_id, granted_at)
  VALUES (user_email, payment_id, now())
  ON CONFLICT (email, payment_id) DO NOTHING;
  
  -- Add your custom logic here to grant access to the user
  -- For example: update user permissions, send welcome email, etc.
END;
$$;

-- Create user access log table
CREATE TABLE IF NOT EXISTS user_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  payment_id text NOT NULL,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(email, payment_id)
);

ALTER TABLE user_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage access log"
  ON user_access_log
  FOR ALL
  TO service_role
  USING (true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);