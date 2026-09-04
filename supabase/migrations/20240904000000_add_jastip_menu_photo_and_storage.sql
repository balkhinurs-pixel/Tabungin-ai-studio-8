-- ==========================================================
-- PEMBARUAN MENU JASTIP: UPLOAD FOTO & SUPABASE STORAGE
-- Jalankan skrip ini di Supabase SQL Editor
-- ==========================================================

-- 1. Tambahkan kolom image_url ke tabel public.jastip_items jika belum ada
ALTER TABLE public.jastip_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Konfigurasi Bucket Storage untuk foto menu jastip (jastip-items)
-- Bucket ini bersifat PUBLIC agar gambar dapat dimuat langsung di aplikasi santri & admin
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jastip-items', 
  'jastip-items', 
  true, 
  5242880, -- Batas maksimal 5 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Kebijakan Keamanan Storage (Row Level Security untuk storage.objects)

-- 3.1. Publik (santri, walisantri, pengunjung) dapat melihat dan memuat gambar jastip
DROP POLICY IF EXISTS "Public can view jastip images" ON storage.objects;
CREATE POLICY "Public can view jastip images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'jastip-items' );

-- 3.2. Pengguna terautentikasi (Guru / Admin) dapat mengunggah foto produk jastip
DROP POLICY IF EXISTS "Authenticated users can upload jastip images" ON storage.objects;
CREATE POLICY "Authenticated users can upload jastip images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'jastip-items' );

-- 3.3. Pengguna terautentikasi dapat memperbarui foto produk jastip
DROP POLICY IF EXISTS "Authenticated users can update jastip images" ON storage.objects;
CREATE POLICY "Authenticated users can update jastip images"
ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'jastip-items' );

-- 3.4. Pengguna terautentikasi dapat menghapus foto produk jastip
DROP POLICY IF EXISTS "Authenticated users can delete jastip images" ON storage.objects;
CREATE POLICY "Authenticated users can delete jastip images"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'jastip-items' );
