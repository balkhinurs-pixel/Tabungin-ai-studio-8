-- ==========================================
-- TABUNGIN DATABASE BLUEPRINT (FULL INSTALL)
-- ==========================================

-- 1. PROFILES TABLE (Guru & Kantin)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'ADMIN',
    plan TEXT DEFAULT 'TRIAL',
    school_name TEXT,
    school_code TEXT UNIQUE,
    custom_quota INTEGER DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'CANTINE')),
    CONSTRAINT profiles_plan_check CHECK (plan IN ('TRIAL', 'PRO'))
);

-- 2. STUDENTS TABLE (Siswa)
CREATE TABLE public.students (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nis TEXT NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    whatsapp_number TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nis, user_id)
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'TABUNGAN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT transactions_type_check CHECK (type IN ('Pemasukan', 'Pengeluaran')),
    CONSTRAINT transactions_category_check CHECK (category IN ('TABUNGAN', 'BELANJA_KANTIN', 'TARIK_TUNAI'))
);

-- 4. ACTIVATION CODES TABLE
CREATE TABLE public.activation_codes (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES public.profiles(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- KEAMANAN (RLS - ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW SECURITY;
ALTER TABLE public.transactions ENABLE ROW SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW SECURITY;

-- Polisi untuk PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Polisi untuk STUDENTS
CREATE POLICY "Admins can manage their students" ON public.students 
    USING (auth.uid() = user_id);

CREATE POLICY "Students can view own profile" ON public.students 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Cantine can view students in same school" ON public.students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles merchant
            JOIN public.profiles guru ON guru.school_code = merchant.school_code
            WHERE merchant.id = auth.uid()
            AND merchant.role = 'CANTINE'
            AND guru.id = students.user_id
        )
    );

-- Polisi untuk TRANSACTIONS
CREATE POLICY "Admins can manage their transactions" ON public.transactions 
    USING (auth.uid() = user_id);

CREATE POLICY "Students can view own transactions" ON public.transactions 
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Cantine can insert payment transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'CANTINE' )
    );

-- ==========================================
-- FUNGSI & OTOMATISASI (TRIGGERS)
-- ==========================================

-- Fungsi untuk membuat profil guru otomatis saat pendaftaran (Email/Google)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Hanya buat profil jika pendaftar BUKAN akun bayangan siswa (nis@school.supabase.user)
    IF NEW.email NOT LIKE '%.supabase.user' THEN
        INSERT INTO public.profiles (id, email, role, plan)
        VALUES (NEW.id, NEW.email, 'ADMIN', 'TRIAL');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fungsi RPC untuk Aktivasi Akun PRO
CREATE OR REPLACE FUNCTION public.activate_account(p_code TEXT, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.activation_codes WHERE code = p_code AND is_used = FALSE) THEN
        UPDATE public.activation_codes 
        SET is_used = TRUE, used_by = p_user_id, used_at = NOW() 
        WHERE code = p_code;

        UPDATE public.profiles 
        SET plan = 'PRO' 
        WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION 'invalid_or_used_code';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PERINTAH DARURAT (Gunakan jika profil tidak muncul)
-- ==========================================
-- INSERT INTO public.profiles (id, email, role, plan)
-- SELECT id, email, 'ADMIN', 'TRIAL' FROM auth.users 
-- WHERE email = 'EMAIL_ANDA_DISINI'
-- ON CONFLICT DO NOTHING;