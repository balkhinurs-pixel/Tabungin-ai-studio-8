-- Initial Schema: Defines the basic tables for the application.

-- Profiles Table: Stores public user data.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    plan TEXT DEFAULT 'TRIAL'::text NOT NULL,
    -- The 'role' column will be added by a separate migration
    -- to avoid issues with existing data.
    -- role TEXT DEFAULT 'USER'::text NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Stores public user data and plan status.';

-- Students Table: Stores student information, linked to a user.
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    whatsapp_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.students IS 'Stores individual student profiles.';

-- Transactions Table: Stores all financial transactions for students.
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.transactions IS 'Records all deposits and withdrawals for students.';

-- Activation Codes Table: Stores codes for upgrading to PRO plan.
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ
);
COMMENT ON TABLE public.activation_codes IS 'Stores activation codes for plan upgrades.';


-- Function to handle new user sign-ups and create a profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger to execute the function when a new user is created in auth.users.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Function to activate a PRO account.
CREATE OR REPLACE FUNCTION public.activate_account(p_code TEXT, p_user_id UUID)
RETURNS TABLE(id UUID, email TEXT, plan TEXT, role TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_code_id BIGINT;
BEGIN
    -- Find the code and lock it
    SELECT ac.id INTO v_code_id FROM public.activation_codes ac
    WHERE ac.code = p_code AND ac.is_used = FALSE
    FOR UPDATE;

    -- If code exists and is not used
    IF FOUND THEN
        -- Mark the code as used
        UPDATE public.activation_codes
        SET is_used = TRUE,
            used_by = p_user_id,
            used_at = NOW()
        WHERE id = v_code_id;

        -- Upgrade the user's plan
        UPDATE public.profiles
        SET plan = 'PRO'
        WHERE profiles.id = p_user_id;

        -- Return the updated profile
        RETURN QUERY SELECT p.id, p.email, p.plan, p.role FROM public.profiles p WHERE p.id = p_user_id;
    ELSE
        -- If code is not found or already used, raise an exception
        RAISE EXCEPTION 'Invalid or already used activation code';
    END IF;
END;
$$;


-- Set up initial RLS policies.
-- These will be modified by subsequent migration files.
-- For now, we enable RLS and add basic policies.

-- Enable RLS for all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- Default policies: Users can only manage their own data.
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own students" ON public.students
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage transactions for their students" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for activation codes for the activation process
CREATE POLICY "Allow public read on activation codes" ON public.activation_codes
    FOR SELECT USING (true);
