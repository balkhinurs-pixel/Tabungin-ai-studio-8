-- 1. Create custom transaction_type ENUM
CREATE TYPE transaction_type AS ENUM ('Pemasukan', 'Pengeluaran');

-- 2. Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    plan TEXT DEFAULT 'TRIAL' NOT NULL
);

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Create students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nis TEXT NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, nis)
);

-- 4. Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    type transaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create activation_codes table
CREATE TABLE activation_codes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to activate an account
CREATE OR REPLACE FUNCTION activate_account(p_code TEXT, p_user_id UUID)
RETURNS TABLE (profile_id UUID, new_plan TEXT) AS $$
DECLARE
  v_code_id BIGINT;
BEGIN
  -- Check if code exists and is not used, then lock the row
  SELECT id INTO v_code_id FROM activation_codes WHERE code = p_code AND is_used = FALSE FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Kode aktivasi tidak valid atau sudah digunakan.';
  END IF;

  -- Update profile plan
  UPDATE profiles
  SET plan = 'PRO'
  WHERE id = p_user_id;

  -- Mark the code as used
  UPDATE activation_codes
  SET 
    is_used = TRUE,
    used_by = p_user_id,
    used_at = NOW()
  WHERE id = v_code_id;
  
  RETURN QUERY SELECT id, plan FROM profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Setup Row Level Security (RLS)
-- Enable RLS for all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
-- Users can see their own profile
CREATE POLICY "Users can see their own profile." ON profiles
  FOR SELECT USING (auth.uid() = id);
-- Users can update their own profile
CREATE POLICY "Users can update their own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for students
-- Users can manage students linked to their user_id
CREATE POLICY "Users can manage their own students." ON students
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for transactions
-- Users can manage transactions linked to their user_id
CREATE POLICY "Users can manage their own transactions." ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Make new storage buckets public.
-- Used for profile images or other public assets.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

-- NOTE: For admin-only access to activation codes, you would typically
-- create a separate admin role or use a service_role key from a secure backend.
-- The policies below are a basic setup.

ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- For now, we allow admins (identified by a specific role you'd create) to manage codes.
-- This is a placeholder; you should create a role like 'admin' in your Supabase project.
-- CREATE POLICY "Admins can manage activation codes" ON activation_codes
--   FOR ALL USING (auth.role() = 'admin');

-- Or, for development, you can disable RLS for a specific user via the Supabase UI
-- or keep it disabled until you have a proper admin role setup.
-- For the purpose of the app working, we'll allow authenticated users to read codes,
-- but inserts/updates should be locked down.
CREATE POLICY "Authenticated users can view codes" ON activation_codes
  FOR SELECT USING (auth.role() = 'authenticated');
  
-- Important: You MUST use the `service_role` key from a secure backend (like an Edge Function)
-- to generate codes. Do NOT allow clients to insert into this table.
-- The RPC function `activate_account` handles the secure usage of a code.
ALTER TABLE profiles ADD COLUMN custom_quota INTEGER DEFAULT NULL;
