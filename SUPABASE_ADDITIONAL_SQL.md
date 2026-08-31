# Panduan Pembaruan Database Supabase (Tabungin V2)

Salin dan jalankan seluruh blok kode di bawah ini sekaligus di **Supabase SQL Editor**. Skrip ini akan menambahkan kolom yang diperlukan, mempercepat performa dengan indeks, dan memperbaiki izin akses agar Guru serta Kantin bisa melihat data transaksi yang sinkron.

```sql
-- ==========================================================
-- 1. TAMBAHKAN KOLOM (WAJIB)
-- ==========================================================
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'TABUNGAN',
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- ==========================================================
-- 2. BUAT INDEKS (PERFORMA)
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_is_settled ON public.transactions(is_settled);

-- ==========================================================
-- 3. IZIN AKSES GURU (SINKRONISASI SALDO GLOBAL)
-- Agar Guru bisa melihat transaksi belanja siswanya di Kantin
-- ==========================================================
DROP POLICY IF EXISTS "Teachers can view their managed students' transactions" ON public.transactions;

CREATE POLICY "Teachers can view their managed students' transactions" 
ON public.transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.id = transactions.student_id 
    AND students.user_id = auth.uid()
  )
);

-- ==========================================================
-- 4. IZIN AKSES KANTIN (UNTUK MENAMPILKAN NAMA SISWA)
-- Agar petugas kantin bisa melihat nama & kelas siswa di dashboard mereka
-- ==========================================================
DROP POLICY IF EXISTS "Cantine can view students in the same school" ON public.students;

CREATE POLICY "Cantine can view students in the same school" 
ON public.students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS my_p
    JOIN public.profiles AS guru_p ON guru_p.school_code = my_p.school_code
    WHERE my_p.id = auth.uid() 
    AND my_p.role = 'CANTINE'
    AND guru_p.id = students.user_id
  )
);

-- ==========================================================
-- 6. TABEL DAN IZIN JASTIP / TOKO SANTRI
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.jastip_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Kebutuhan Santri',
    price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    whatsapp_number TEXT,
    is_available BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.jastip_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT DEFAULT 'SALDO',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_jastip_whatsapp TEXT;

CREATE INDEX IF NOT EXISTS idx_jastip_items_user_id ON public.jastip_items(user_id);
CREATE INDEX IF NOT EXISTS idx_jastip_orders_student_id ON public.jastip_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_jastip_orders_user_id ON public.jastip_orders(user_id);

ALTER TABLE public.jastip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jastip_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jastip items readable by authenticated users" ON public.jastip_items;
CREATE POLICY "Jastip items readable by authenticated users"
ON public.jastip_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers manage their own jastip items" ON public.jastip_items;
CREATE POLICY "Teachers manage their own jastip items"
ON public.jastip_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can view their own jastip orders" ON public.jastip_orders;
CREATE POLICY "Students can view their own jastip orders"
ON public.jastip_orders FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their jastip orders" ON public.jastip_orders;
CREATE POLICY "Students can insert their jastip orders"
ON public.jastip_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view and manage their school jastip orders" ON public.jastip_orders;
CREATE POLICY "Teachers can view and manage their school jastip orders"
ON public.jastip_orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```