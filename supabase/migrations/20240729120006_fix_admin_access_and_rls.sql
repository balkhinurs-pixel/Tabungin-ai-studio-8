-- This is a new, simplified migration to fix admin access issues.
-- It disables RLS on profiles to prevent recursion, and sets up correct RLS for other tables.

-- 1. Add `role` column to profiles table if it doesn't exist.
-- This ensures the column is there without causing errors on subsequent runs.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'USER' NOT NULL;
  END IF;
END $$;


-- 2. Disable RLS on `profiles` to prevent infinite recursion.
-- This is the key fix to allow admins to log in and check roles.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- We will rely on Supabase API rules at the edge for reads if needed, but for now, this unblocks the app.


-- 3. Setup RLS for `students` table.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;

CREATE POLICY "Users can manage their own students"
  ON public.students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all students"
  ON public.students FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');


-- 4. Setup RLS for `transactions` table.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their students' transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;

-- A user can manage a transaction if they are the user_id on the transaction record.
CREATE POLICY "Users can manage their own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON public.transactions FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');


-- 5. Setup RLS for `activation_codes` table.
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage activation codes" ON public.activation_codes;
DROP POLICY IF EXISTS "Authenticated users can read activation codes" ON public.activation_codes;

CREATE POLICY "Admins can manage activation codes"
  ON public.activation_codes FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

-- Allow authenticated users to read codes for the activation process.
CREATE POLICY "Authenticated users can read activation codes"
  ON public.activation_codes FOR SELECT
  TO authenticated
  USING (true);


-- 6. Setup RLS for `auth.users` to allow admins to see all users
-- This might not be needed if we only query `profiles`, but it's good practice.
-- Note: Admin API is needed to query auth.users from client, so we will rely on `profiles` table for user list.
-- This section is commented out as it requires more advanced setup.
/*
CREATE POLICY "Allow admin read access to all users"
  ON auth.users FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');
*/
