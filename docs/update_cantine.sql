-- 1. Hapus aturan lama agar bisa diperbarui
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update semua user yang sudah ada ke peran USER terlebih dahulu (untuk keamanan)
UPDATE public.profiles SET role = 'USER' WHERE role IS NULL OR role = 'ADMIN';

-- 3. Identifikasi akun siswa lama dan ubah rolenya ke STUDENT secara otomatis
UPDATE public.profiles 
SET role = 'STUDENT' 
WHERE email LIKE '%.supabase.user';

-- 4. Pasang aturan role baru yang mendukung STUDENT dan CANTINE
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'CANTINE', 'USER', 'STUDENT'));

-- 5. Perbarui fungsi trigger untuk pendaftaran otomatis yang lebih cerdas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Jika email adalah email bayangan siswa, set role ke STUDENT
  IF NEW.email LIKE '%.supabase.user' THEN
    v_role := 'STUDENT';
  ELSE
    -- Jika email biasa, set ke USER (harus pilih peran di /welcome)
    v_role := 'USER';
  END IF;

  INSERT INTO public.profiles (id, email, role, plan)
  VALUES (NEW.id, NEW.email, v_role, 'TRIAL')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(profiles.role, EXCLUDED.role);
      
  RETURN NEW;
END;
$$;