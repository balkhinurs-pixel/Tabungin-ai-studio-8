-- ==========================================================
-- PEMBARUAN PROFIL SISWA: FOTO PROFIL SISWA & SUPABASE STORAGE
-- Jalankan skrip ini di Supabase SQL Editor
-- ==========================================================

-- 1. Tambahkan kolom avatar_url ke tabel public.students jika belum ada
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Konfigurasi Bucket Storage untuk foto siswa (student-photos)
-- Bucket ini bersifat PUBLIC agar gambar dapat dimuat di Cetak Kartu, Kiosk, dan Dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos', 
  'student-photos', 
  true, 
  5242880, -- Batas maksimal 5 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 3. Kebijakan Keamanan Storage (Row Level Security untuk storage.objects)

-- 3.1. Publik (Kiosk, Preview Kartu, Siswa) dapat melihat dan memuat foto profil siswa
DROP POLICY IF EXISTS "Public can view student photos" ON storage.objects;
CREATE POLICY "Public can view student photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'student-photos' );

-- 3.2. Pengguna terautentikasi (Guru / Admin) dapat mengunggah foto profil siswa
DROP POLICY IF EXISTS "Authenticated users can upload student photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload student photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'student-photos' );

-- 3.3. Pengguna terautentikasi dapat memperbarui foto profil siswa
DROP POLICY IF EXISTS "Authenticated users can update student photos" ON storage.objects;
CREATE POLICY "Authenticated users can update student photos"
ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'student-photos' );

-- 3.4. Pengguna terautentikasi dapat menghapus foto profil siswa
DROP POLICY IF EXISTS "Authenticated users can delete student photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete student photos"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'student-photos' );
