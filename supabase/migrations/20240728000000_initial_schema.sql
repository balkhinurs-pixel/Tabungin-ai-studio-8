-- supabase/migrations/20240728000000_initial_schema.sql

-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT DEFAULT 'TRIAL'::text NOT NULL,
  role TEXT DEFAULT 'USER'::text NOT NULL
);

-- Create the students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create the transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create the activation_codes table
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ
);


-- Function to handle new user sign-up and create a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, role)
  VALUES (new.id, new.email, 'TRIAL', 'USER');
  RETURN new;
END;
$$;

-- Trigger to call the function when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Function to activate account
CREATE OR REPLACE FUNCTION public.activate_account(p_code TEXT, p_user_id UUID)
RETURNS TABLE(id UUID, email TEXT, plan TEXT, role TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code_id BIGINT;
BEGIN
  -- Find the code and lock it
  SELECT ac.id INTO v_code_id
  FROM public.activation_codes ac
  WHERE ac.code = p_code AND ac.is_used = FALSE
  FOR UPDATE;

  -- If code is valid and not used
  IF v_code_id IS NOT NULL THEN
    -- Mark code as used
    UPDATE public.activation_codes
    SET is_used = TRUE, used_by = p_user_id, used_at = NOW()
    WHERE id = v_code_id;

    -- Update user's plan to PRO
    UPDATE public.profiles
    SET plan = 'PRO'
    WHERE public.profiles.id = p_user_id;
    
    -- Return the updated profile
    RETURN QUERY
    SELECT p.id, p.email, p.plan, p.role FROM public.profiles p WHERE p.id = p_user_id;
  ELSE
    -- Raise an exception if the code is invalid or already used
    RAISE EXCEPTION 'Invalid or already used activation code.';
  END IF;
END;
$$;


-- Initial Row Level Security Policies
-- Note: More specific policies are handled in a separate migration file.

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Default policies allowing users to manage their own data.
-- Admin override policies will be in a separate migration.

-- Profiles
CREATE POLICY "Allow individual read access" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Students
CREATE POLICY "Users can manage their own students" ON public.students FOR ALL USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can manage transactions for their students" ON public.transactions FOR ALL USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- Activation Codes
CREATE POLICY "Allow read access for authenticated users" ON public.activation_codes FOR SELECT USING (auth.role() = 'authenticated');
