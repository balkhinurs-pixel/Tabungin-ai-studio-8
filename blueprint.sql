-- ==============================================================================
-- BLUEPRINT DATABASE SUPABASE - TABUNGIN V2 (LENGKAP & SIAP PAKAI)
-- File ini berisi seluruh struktur tabel, kolom, enum, indeks, fungsi, trigger,
-- dan kebijakan keamanan (RLS) untuk deployment proyek Supabase baru.
-- ==============================================================================

-- 1. BUAT ENUM TYPE UNTUK TRANSAKSI (JIKA BELUM ADA)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('Pemasukan', 'Pengeluaran');
    END IF;
END $$;

-- 2. TABEL PROFILES (DENGAN ROLE & FITUR FONNTE WA)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'GURU', -- Roles: GURU, CANTINE, ADMIN, KIOSK
    school_name TEXT,
    school_code TEXT,
    plan TEXT DEFAULT 'TRIAL' NOT NULL,
    custom_quota INTEGER DEFAULT NULL,
    admin_fee NUMERIC DEFAULT 0,
    fonnte_token TEXT,
    low_balance_threshold NUMERIC DEFAULT 10000,
    low_balance_template TEXT DEFAULT 'Halo Bapak/Ibu Wali dari *{nama}*,\n\nMemberitahukan bahwa sisa saldo tabungan putra/putri Anda saat ini hampir habis, yaitu tinggal:\n💰 *{saldo}*\n\nMohon lakukan pengisian ulang saldo tabungan melalui pihak sekolah agar kegiatan jajan dan transaksi siswa berjalan lancar.\n\nUntuk memantau transaksi & sisa saldo secara real-time, silakan buka aplikasi orang tua di:\n🔗 Link Login: {url_login}\n🏫 Kode Sekolah: *{kode_sekolah}*\n🆔 NIS: *{nis}*\n\nTerima kasih atas perhatian Bapak/Ibu.',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom opsional ada jika tabel profiles sudah ada sebelumnya
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'GURU';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_quota INTEGER DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_fee NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fonnte_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS low_balance_threshold NUMERIC DEFAULT 10000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS low_balance_template TEXT;

-- 3. FUNCTION & TRIGGER UNTUK MEMBUAT PROFILE OTOMATIS SAAT USER BARU DAFTAR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. TABEL STUDENTS (SISWA)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nis TEXT NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    whatsapp_number TEXT,
    pin TEXT,
    daily_limit NUMERIC DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, nis)
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS daily_limit NUMERIC DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 5. TABEL TRANSACTIONS (TRANSAKSI TABUNGAN & KANTIN)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    type transaction_type NOT NULL,
    category TEXT DEFAULT 'TABUNGAN', -- Category: TABUNGAN, BELANJA_KANTIN, SETTLEMENT, BIAYA_ADMIN
    is_settled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'TABUNGAN';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- 6. TABEL CANTEEN_ITEMS (MENU / PRODUK KANTIN)
CREATE TABLE IF NOT EXISTS public.canteen_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Makanan',
    price NUMERIC NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL ACTIVATION_CODES (KODE AKTIVASI AKUN PRO)
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FUNCTION RPC UNTUK AKTIVASI AKUN KODE VOUCHER
CREATE OR REPLACE FUNCTION activate_account(p_code TEXT, p_user_id UUID)
RETURNS TABLE (profile_id UUID, new_plan TEXT) AS $$
DECLARE
  v_code_id BIGINT;
BEGIN
  SELECT id INTO v_code_id FROM public.activation_codes WHERE code = p_code AND is_used = FALSE FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Kode aktivasi tidak valid atau sudah digunakan.';
  END IF;

  UPDATE public.profiles
  SET plan = 'PRO'
  WHERE id = p_user_id;

  UPDATE public.activation_codes
  SET 
    is_used = TRUE,
    used_by = p_user_id,
    used_at = NOW()
  WHERE id = v_code_id;
  
  RETURN QUERY SELECT id, plan FROM public.profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. PERFORMANCE INDEXES (OPTIMASI KINERJA QUERY)
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students(nis);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_is_settled ON public.transactions(is_settled);
CREATE INDEX IF NOT EXISTS idx_canteen_items_user_id ON public.canteen_items(user_id);

-- 9. ROW LEVEL SECURITY (RLS) & POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteen_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Users can see their own profile." ON public.profiles;
CREATE POLICY "Users can see their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POLICIES FOR STUDENTS
DROP POLICY IF EXISTS "Users can manage their own students." ON public.students;
CREATE POLICY "Users can manage their own students." ON public.students FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cantine can view students in the same school" ON public.students;
CREATE POLICY "Cantine can view students in the same school" ON public.students FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS my_p
    JOIN public.profiles AS guru_p ON guru_p.school_code = my_p.school_code
    WHERE my_p.id = auth.uid() 
    AND my_p.role = 'CANTINE'
    AND guru_p.id = students.user_id
  )
);

-- POLICIES FOR TRANSACTIONS
DROP POLICY IF EXISTS "Users can manage their own transactions." ON public.transactions;
CREATE POLICY "Users can manage their own transactions." ON public.transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view their managed students' transactions" ON public.transactions;
CREATE POLICY "Teachers can view their managed students' transactions" ON public.transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = transactions.student_id 
    AND students.user_id = auth.uid()
  )
);

-- POLICIES FOR CANTEEN ITEMS
DROP POLICY IF EXISTS "Users can manage their own canteen items." ON public.canteen_items;
CREATE POLICY "Users can manage their own canteen items." ON public.canteen_items FOR ALL USING (auth.uid() = user_id);

-- POLICIES FOR ACTIVATION CODES
DROP POLICY IF EXISTS "Authenticated users can view codes" ON public.activation_codes;
CREATE POLICY "Authenticated users can view codes" ON public.activation_codes FOR SELECT USING (auth.role() = 'authenticated');

-- 10. STORAGE BUCKET UNTUK AVATAR / FOTO
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' );
