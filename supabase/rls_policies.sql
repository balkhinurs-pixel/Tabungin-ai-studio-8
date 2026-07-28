-- ----------------------------------------------------------------
-- Kebijakan Row Level Security (RLS) untuk Tabel PROFILES
-- ----------------------------------------------------------------

-- 1. Aktifkan RLS untuk tabel profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada untuk menghindari duplikasi
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;

-- 2. Buat kebijakan SELECT: Pengguna hanya dapat melihat profil mereka sendiri.
CREATE POLICY "Users can view their own profile."
ON public.profiles
FOR SELECT
USING (auth.uid() = id);


-- ----------------------------------------------------------------
-- Kebijakan Row Level Security (RLS) untuk Tabel STUDENTS
-- ----------------------------------------------------------------

-- 1. Aktifkan RLS untuk tabel students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada
DROP POLICY IF EXISTS "Students can view their own profile." ON public.students;
DROP POLICY IF EXISTS "Admins can view all students." ON public.students;
DROP POLICY IF EXISTS "Admins can manage students." ON public.students;


-- 2. Buat kebijakan SELECT untuk SISWA: Siswa hanya dapat melihat data mereka sendiri.
--    Ini membandingkan ID pengguna yang sedang login (auth.uid()) dengan kolom ID di tabel students.
CREATE POLICY "Students can view their own profile."
ON public.students
FOR SELECT
USING (auth.uid() = id);


-- 3. Buat kebijakan SELECT untuk GURU/ADMIN: Guru dapat melihat semua siswa yang mereka buat.
--    Ini membandingkan ID pengguna yang sedang login (auth.uid()) dengan kolom user_id (pembuat siswa).
CREATE POLICY "Admins can view all students."
ON public.students
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Buat kebijakan INSERT, UPDATE, DELETE untuk GURU/ADMIN.
CREATE POLICY "Admins can manage students."
ON public.students
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- Kebijakan Row Level Security (RLS) untuk Tabel TRANSACTIONS
-- ----------------------------------------------------------------

-- 1. Aktifkan RLS untuk tabel transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada
DROP POLICY IF EXISTS "Students can view their own transactions." ON public.transactions;
DROP POLICY IF EXISTS "Admins can view transactions of their students." ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage transactions." ON public.transactions;

-- 2. Buat kebijakan SELECT untuk SISWA: Siswa hanya dapat melihat transaksi mereka sendiri.
CREATE POLICY "Students can view their own transactions."
ON public.transactions
FOR SELECT
USING (auth.uid() = student_id);

-- 3. Buat kebijakan SELECT untuk GURU/ADMIN: Guru dapat melihat transaksi milik siswa yang mereka kelola.
CREATE POLICY "Admins can view transactions of their students."
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Buat kebijakan INSERT, UPDATE, DELETE untuk GURU/ADMIN.
CREATE POLICY "Admins can manage transactions."
ON public.transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- Kebijakan Row Level Security (RLS) untuk Tabel ACTIVATION_CODES
-- ----------------------------------------------------------------

-- 1. Aktifkan RLS untuk tabel activation_codes
--    Hanya admin (melalui service_role_key) yang boleh mengakses ini secara default.
--    Jika Anda perlu user biasa untuk membaca, kebijakan spesifik harus dibuat.
--    Untuk saat ini, kita amankan dulu.
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
