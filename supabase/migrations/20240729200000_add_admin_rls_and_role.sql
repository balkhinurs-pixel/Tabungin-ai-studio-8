-- This migration is safe to run on an existing database.
-- It adds the 'role' column if it doesn't exist and sets up RLS policies for admin access.

-- 1. Add 'role' column to 'profiles' table if it doesn't exist.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';

-- 2. Create a helper function to safely get the user's role.
-- This function is crucial to avoid recursion errors in RLS policies.
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Drop existing policies if they exist, to replace them with corrected ones.
DROP POLICY IF EXISTS "Allow admin to manage activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles" ON public.profiles;


-- 4. Create correct RLS policies for the 'activation_codes' table.
-- This policy allows admins to do anything with activation codes.
CREATE POLICY "Allow admin to manage activation codes"
ON public.activation_codes
FOR ALL
USING (get_user_role(auth.uid()) = 'ADMIN')
WITH CHECK (get_user_role(auth.uid()) = 'ADMIN');

-- 5. Create correct RLS policies for the 'profiles' table.
-- Policy 1: Users can always see their own profile.
CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Admins can see all user profiles.
CREATE POLICY "Allow admins to view all profiles"
ON public.profiles
FOR SELECT
USING (get_user_role(auth.uid()) = 'ADMIN');
