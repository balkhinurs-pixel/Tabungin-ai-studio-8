-- -----------------------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Stores public-facing profile data for each user.
-- -----------------------------------------------------------------------------------------------
CREATE TABLE if not exists public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan text DEFAULT 'TRIAL'::text,
  role text DEFAULT 'USER'::text,
  school_name text,
  school_code text UNIQUE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------------------------
-- 2. STUDENTS TABLE
-- Stores student data, linked to a teacher/admin (user_id) and their own auth account (id).
-- -----------------------------------------------------------------------------------------------
CREATE TABLE if not exists public.students (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  nis text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "class" text,
  whatsapp_number text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE
-- Stores all financial transactions for each student.
-- -----------------------------------------------------------------------------------------------
CREATE TABLE if not exists public.transactions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  type text NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
  description text NOT NULL,
  amount numeric NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------------------------
-- 4. ACTIVATION CODES TABLE
-- Stores codes for upgrading users to PRO plan.
-- -----------------------------------------------------------------------------------------------
CREATE TABLE if not exists public.activation_codes (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    is_used boolean DEFAULT false,
    used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    used_at timestamp with time zone
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------------------------
-- 5. NEW USER TRIGGER
-- This trigger automatically creates a profile entry for a new user in auth.users.
-- -----------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- -----------------------------------------------------------------------------------------------
-- 6. ACCOUNT ACTIVATION FUNCTION
-- This function securely activates a PRO account using a code.
-- -----------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_account(p_code text, p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_code_id bigint;
BEGIN
  -- Find the code and lock the row for update
  SELECT id INTO v_code_id FROM public.activation_codes WHERE code = p_code AND is_used = false FOR UPDATE;

  -- If code does not exist or is already used, raise an exception
  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_used_code';
  END IF;

  -- Mark the code as used
  UPDATE public.activation_codes
  SET 
    is_used = true,
    used_by = p_user_id,
    used_at = now()
  WHERE id = v_code_id;

  -- Update the user's plan to PRO
  UPDATE public.profiles
  SET plan = 'PRO'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------------------------
-- 7. RLS POLICIES
-- These policies secure the data, ensuring users can only access what they're allowed to.
-- -----------------------------------------------------------------------------------------------

-- Policies for PROFILES table
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
CREATE POLICY "Profiles are viewable by users who created them."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
  
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies for STUDENTS table
DROP POLICY IF EXISTS "Students can view their own profile." ON public.students;
CREATE POLICY "Students can view their own profile."
  ON public.students FOR SELECT
  USING (auth.uid() = id);
  
DROP POLICY IF EXISTS "Teachers can view students they created." ON public.students;
CREATE POLICY "Teachers can view students they created."
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can manage students they created." ON public.students;
CREATE POLICY "Teachers can manage students they created."
  ON public.students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
  
-- Policies for TRANSACTIONS table
DROP POLICY IF EXISTS "Students can view their own transactions." ON public.transactions;
CREATE POLICY "Students can view their own transactions."
  ON public.transactions FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view transactions of their students." ON public.transactions;
CREATE POLICY "Teachers can view transactions of their students."
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can manage transactions of their students." ON public.transactions;
CREATE POLICY "Teachers can manage transactions of their students."
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for ACTIVATION CODES table
DROP POLICY IF EXISTS "Admins can manage activation codes." ON public.activation_codes;
CREATE POLICY "Admins can manage activation codes."
  ON public.activation_codes FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');
  
DROP POLICY IF EXISTS "Users can view codes they have used." ON public.activation_codes;
CREATE POLICY "Users can view codes they have used."
  ON public.activation_codes FOR SELECT
  USING (auth.uid() = used_by);
