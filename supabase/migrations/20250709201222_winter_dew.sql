/*
  # Fix ambiguous column reference in liberar_acesso_ao_usuario function

  1. Changes Made
    - Rename function parameter from `payment_id` to `p_payment_id` to avoid ambiguity
    - Update function body to use the new parameter name
    - This resolves the PostgreSQL error: column reference "payment_id" is ambiguous

  2. Security
    - Function maintains SECURITY DEFINER for proper access control
    - No changes to RLS policies or permissions
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS liberar_acesso_ao_usuario(text, text);

-- Recreate the function with renamed parameter to avoid ambiguity
CREATE OR REPLACE FUNCTION liberar_acesso_ao_usuario(
  user_email text,
  p_payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the access liberation using the renamed parameter
  INSERT INTO public.user_access_log (email, payment_id, granted_at)
  VALUES (user_email, p_payment_id, now())
  ON CONFLICT (email, payment_id) DO NOTHING;
  
  -- Add your custom logic here to grant access to the user
  -- For example: update user permissions, send welcome email, etc.
END;
$$;