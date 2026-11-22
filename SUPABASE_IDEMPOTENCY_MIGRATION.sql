-- Migrasi Tambahan Keamanan Transaksi (Idempotency Key Anti-Dobel Input)
-- Jalankan SQL ini di Supabase SQL Editor untuk proteksi permanen di level database.

-- 1. Tambah kolom idempotency_key pada tabel transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Buat index UNIQUE agar 1 kode transaksi tidak pernah bisa tersimpan 2 kali
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_unique_idx
ON public.transactions (idempotency_key)
WHERE idempotency_key IS NOT NULL;
