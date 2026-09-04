
-- SALIN DAN TEMPEL KODE INI KE SQL EDITOR SUPABASE DAN KLIK RUN

-- 1. Hapus batasan role lama dan buat batasan role yang fleksibel
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'CANTINE', 'USER', 'STUDENT', 'TEACHER', 'GURU'));

-- 2. Hapus aturan unik lama yang memblokir kantin/siswa pakai kode sama
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS school_code_unique;

-- 3. Tambahkan aturan unik: Role guru/admin sekolah kodenya unik sedunia
DROP INDEX IF EXISTS unique_school_teacher;
CREATE UNIQUE INDEX IF NOT EXISTS unique_school_teacher ON profiles (school_code) WHERE (role NOT IN ('CANTINE', 'STUDENT'));

-- 4. Perbarui fungsi trigger pendaftaran agar user baru default-nya masuk ke role 'USER'
-- Serta otomatis mendeteksi akun Siswa dan Kantin melalui format email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, plan)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email LIKE '%.supabase.user' THEN 'STUDENT'
      WHEN new.email LIKE '%.kantin.user' THEN 'CANTINE'
      ELSE 'USER' 
    END,
    'TRIAL'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

