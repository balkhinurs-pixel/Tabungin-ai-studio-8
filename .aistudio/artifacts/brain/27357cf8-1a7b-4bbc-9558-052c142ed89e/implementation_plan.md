# Solusi Profesional Transaksi Tunai Kasir Kantin

Rencana penyempurnaan transaksi kasir kantin untuk pembayaran tunai tanpa ID santri dengan tampilan bersih, elegan, dan profesional tanpa mengekspos kode SQL ke antarmuka kasir.

## User Decisions & Revisions

> [!IMPORTANT]
> **Revisi Utama**:
> - **Zero Technical Clutter di Layar Kasir**: Tidak menampilkan kode SQL, query database, atau istilah teknis pada layar kasir (POS) agar tampilan tetap profesional dan nyaman bagi petugas kasir.
> - **Self-Healing / Fallback Cerdas di Backend**: Jika database Supabase belum sempat dijalankan `ALTER TABLE` (kolom `student_id` masih `NOT NULL`), sistem backend otomatis mengaitkan transaksi kasir ke entri sistem `Pembeli Umum Kantin` sehingga kasir tidak akan pernah mengalami transaksi gagal/macet.
> - **Panduan SQL untuk Admin**: Perintah SQL pembaruan database tetap disediakan di dokumentasi teknis (`SUPABASE_ADDITIONAL_SQL.md`, `supabase/schema.sql`) dan menu Pengaturan Admin khusus.

---

## 1. Arsitektur & Penanganan Cerdas di Backend

### A. Dual-Strategy di Server Action (`src/app/cantine/actions.ts`)
Saat kasir memproses `processCashPaymentAction` dengan pembeli umum (tanpa scan kartu):
1. **Langkah 1 (Primary)**: Sistem mencoba menyimpan transaksi dengan `student_id: null`.
2. **Langkah 2 (Automatic Fallback / Self-Healing)**:
   - Jika Supabase mengembalikan error `violates not-null constraint` pada `student_id`:
   - Backend secara otomatis mendeteksi dan mencari/membuat entri akun virtual:
     - Nama: `Pembeli Umum (Kas Kantin)`
     - NIS: `CASH-UMUM`
     - Kelas: `Umum / Kasir`
   - Menyimpan transaksi menggunakan ID akun virtual tersebut dengan catatan nama pembeli asli (misal: "Tamu", "Guru", atau nama pembeli manual).
3. **Hasil**: Transaksi kasir **langsung sukses seketika**, stok barang terpotong tepat, struk tercetak rapi, dan kasir tidak terganggu oleh error database.

---

## 2. Tampilan Kasir Profesional (Zero-SQL UI)

### A. Layar Kasir POS (`src/app/cantine/payment/page.tsx`)
- **Tampilan Bersih**: Menjaga estetika antarmuka POS tetap modern, minimalis, dan berstandar SaaS kasir ritel.
- **Notifikasi Ramah Operasional**:
  - Jika terjadi kendala jaringan atau kegagalan lainnya, hanya menampilkan pesan operasional ramah seperti:
    *"Gagal memproses transaksi. Silakan periksa koneksi internet atau ulangi kembali."*
  - Tidak ada popup query SQL atau error database mentah di layar kasir.

### B. Struk Pembayaran & Riwayat Transaksi
- Struk kasir tetap mencantumkan identitas yang jelas:
  - `METODE: TUNAI (CASH)`
  - `PEMBELI: Pembeli Umum` (atau nama kustom yang dimasukkan kasir)
  - `KASIR: Petugas Kantin`
  - Total belanja, nominal uang tunai, dan kembalian.
- Di halaman riwayat (`/cantine/history/page.tsx`), transaksi tunai tampil dengan lencana badge `TUNAI` yang membedakan uang fisik di laci dengan transaksi tabungan santri.

---

## 3. Pembaruan Skema & Dokumentasi Database

Bagi administrator/developer yang ingin menjalankan migrasi agar `student_id` benar-benar nullable:
- **Perintah SQL**:
  ```sql
  -- Mengubah kolom student_id pada tabel transactions menjadi opsional (NULL)
  ALTER TABLE public.transactions ALTER COLUMN student_id DROP NOT NULL;
  ```
- **File yang diperbarui**:
  - `SUPABASE_ADDITIONAL_SQL.md`
  - `supabase/schema.sql`
  - `docs/update_cantine.sql`

---

## 4. Rencana Langkah Kerja (Implementation Steps)

1. **Pembaruan `src/app/cantine/actions.ts`**:
   - Implementasikan fungsi fallback otomatis `getOrCreateGeneralBuyerStudentId()`.
   - Modifikasi `processCashPaymentAction`: Coba simpan dengan `student_id: null`. Jika ditolak oleh not-null constraint, otomatis fallback ke akun virtual pembeli umum.
2. **Pembersihan Pesan Error di `src/app/cantine/payment/page.tsx`**:
   - Pastikan toast / alert hanya menampilkan pesan berbahasa Indonesia yang sopan dan profesional untuk kasir.
3. **Pembaruan Berkas Skema Database**:
   - Perbarui `supabase/schema.sql` dan `SUPABASE_ADDITIONAL_SQL.md`.
4. **Pengujian & Kompilasi**:
   - Jalankan `compile_applet` untuk memastikan seluruh tipe data, komponen, dan endpoint lulus validasi.
