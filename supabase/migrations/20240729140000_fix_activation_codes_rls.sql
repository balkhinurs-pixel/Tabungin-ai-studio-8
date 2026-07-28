-- Drop the old, incorrect policies
DROP POLICY IF EXISTS "Allow admin to manage codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Allow authenticated users to read codes" ON public.activation_codes;

-- Create a new policy that allows ADMIN users to do everything
CREATE POLICY "Admins can manage activation codes"
ON public.activation_codes
FOR ALL
USING (
  (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  ) = 'ADMIN'::text
)
WITH CHECK (
  (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  ) = 'ADMIN'::text
);

-- Re-add a policy for authenticated users to simply read/select codes.
-- This is needed for the activation page to check if a code is valid.
CREATE POLICY "Authenticated users can read activation codes"
ON public.activation_codes
FOR SELECT
USING (auth.role() = 'authenticated');
