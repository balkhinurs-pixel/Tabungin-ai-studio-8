
-- SALIN DAN TEMPEL KODE INI KE SQL EDITOR SUPABASE DAN KLIK RUN

-- 1. Hapus aturan unik lama yang memblokir kantin/siswa pakai kode sama
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS school_code_unique;

-- 2. Tambahkan aturan unik BARU: Hanya role TEACHER (Guru) yang kodenya tidak boleh kembar sedunia.
-- Role CANTINE dan STUDENT boleh memiliki kode yang sama dengan gurunya.
CREATE UNIQUE INDEX IF NOT EXISTS unique_school_teacher ON profiles (school_code) WHERE (role = 'TEACHER');

-- 3. Perbarui fungsi trigger pendaftaran agar user baru default-nya masuk ke role 'USER'
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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
