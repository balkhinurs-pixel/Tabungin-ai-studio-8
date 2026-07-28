-- supabase/migrations/20240729123000_consolidated_auth_updates.sql

-- Step 1: Add the 'role' column to profiles if it doesn't exist.
-- This is safe to run even if the column already exists.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER' NOT NULL;

-- Step 2: Enable Row Level Security on all relevant tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;


-- Step 3: Drop existing policies to start fresh. This avoids conflicts.
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Allow all access for admins" ON public.activation_codes;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.activation_codes;

DROP POLICY IF EXISTS "Users can manage their own students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;

DROP POLICY IF EXISTS "Users can manage transactions for their students" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;


-- Step 4: Create a function to get the user role from the profiles table.
-- This function is crucial to avoid recursion in policies.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


-- Step 5: Recreate policies for 'profiles' table.
-- This is the most critical part to fix the recursion error.

-- Policy 1: Users can see their own profile.
CREATE POLICY "Allow individual read access"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Admins can see ALL profiles.
-- The check is done using the helper function to prevent recursion.
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'ADMIN');

-- Policy 3: Users can update their own profile.
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- Step 6: Recreate policies for 'activation_codes' table.
CREATE POLICY "Allow all access for admins"
ON public.activation_codes
FOR ALL
USING (public.get_current_user_role() = 'ADMIN')
WITH CHECK (public.get_current_user_role() = 'ADMIN');

-- Allow authenticated (but non-admin) users to read codes for activation checks.
CREATE POLICY "Allow read access for authenticated users"
ON public.activation_codes
FOR SELECT
USING (auth.role() = 'authenticated');


-- Step 7: Policies for 'students' table.
CREATE POLICY "Users can manage their own students"
ON public.students
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all students"
ON public.students
FOR ALL
USING (public.get_current_user_role() = 'ADMIN')
WITH CHECK (public.get_current_user_role() = 'ADMIN');


-- Step 8: Policies for 'transactions' table.
-- This policy uses a subquery, which is safe here.
CREATE POLICY "Users can manage transactions for their students"
ON public.transactions
FOR ALL
USING (student_id IN (
  SELECT id FROM public.students WHERE user_id = auth.uid()
))
WITH CHECK (student_id IN (
  SELECT id FROM public.students WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all transactions"
ON public.transactions
FOR ALL
USING (public.get_current_user_role() = 'ADMIN')
WITH CHECK (public.get_current_user_role() = 'ADMIN');
