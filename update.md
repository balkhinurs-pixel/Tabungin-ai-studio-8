# 🏛️ Blueprint & Roadmap Pengembangan Sistem e-Pesantren Terpadu

Dokumen ini memuat arsitektur, spesifikasi modul, skema data konseptual, dan tahapan peluncuran bertahap (*phased rollout*) untuk mengembangkan ekosistem aplikasi dari sistem tabungan/kios saat ini menjadi **Platform e-Pesantren All-in-One**.

---

## 🎯 Visi & Fondasi Ekosistem

Memanfaatkan satu identitas kartu santri pintar (**Smart ID Card / QR / Barcode**) yang telah terpasang untuk mengintegrasikan seluruh aspek operasional pesantren: **Keuangan Cashless**, **Keamanan & Perizinan**, **Akademik & Tahfidz**, **Kedisiplinan & Kesehatan**, serta **Keterbukaan Informasi ke Wali Santri**.

```
                      ┌────────────────────────────────────────┐
                      │          CORE SANTRI & KARTU           │
                      │  (QR / Barcode / Smart ID Card Santri) │
                      └──────────────────┬─────────────────────┘
                                         │
    ┌────────────────────┬───────────────┴───────────────┬────────────────────┐
    ▼                    ▼                               ▼                    ▼
┌──────────────┐ ┌──────────────┐               ┌──────────────┐ ┌────────────────────┐
│ 1. FINANSIAL │ │ 2. PERIZINAN │               │  3. TAHFIDZ  │ │ 4. KEDISIPLINAN &  │
│ & CASHLESS   │ │ & KEPULANGAN │               │ & KAJIAN     │ │   KESEHATAN (UKS)  │
└──────────────┘ └──────────────┘               └──────────────┘ └────────────────────┘
    │                    │                               │                    │
    └────────────────────┴───────────────┬───────────────┴────────────────────┘
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          PORTAL WALI SANTRI            │
                      │   (Cek Saldo, Jajan, Hafalan & Izin)   │
                      └────────────────────────────────────────┘
```

---

## 🗺️ Roadmap Pengembangan Bertahap (*Phased Rollout*)

> ⚠️ **Catatan Penting Pengembangan Bertahap**:
> Setiap fase dirancang modular dan berdiri sendiri (*decoupled*). Modul baru tidak akan merusak alur transaksi uang saku, ATM Kios, atau POS Kantin yang sudah aktif berjalan.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fase 1: Finansial & Pembatasan Jajan Pesantren (Kantin & Tagihan Syahriah) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fase 2: Digital Gatepass & Perizinan Keluar/Pulang Santri (Security Piket) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fase 3: Modul Tahfidz Al-Qur'an, Mutaba'ah, & Kedisiplinan/UKS             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fase 4: Integrasi Super-App Portal Wali Santri & Ekosistem Multi-Unit Usaha│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🟢 FASE 1: Finansial Lanjutan & Kontrol Jajan Santri (*High Priority*)

Fokus: Mengoptimalkan pengelolaan uang saku dan pencegahan pemborosan santri di pondok.

* **1.1. Limit Jajan Harian (*Daily Spending Limit*)**
  * Admin / Wali santri dapat menetapkan plafon maksimal jajan per hari (misal: Rp 15.000 / hari).
  * Sistem POS Kantin dan ATM Kios secara otomatis menolak transaksi jika akumulasi penarikan/belanja hari itu melebihi batas limit.
  * Reset limit otomatis setiap pergantian hari (pukul 00:00).

* **1.2. Modul Tagihan Syahriah / SPP & Uang Makan Bulanan**
  * Pembuatan tagihan berkala (SPP, Uang Makan Asrama, Uang Laundry, Iuran Ekstrakurikuler).
  * Opsi pembayaran:
    * Pembayaran tunai/transfer ke bendahara pondok.
    * *Auto-debit* dari saldo tabungan santri (jika saldo mencukupi dan diizinkan wali santri).
  * Riwayat status tagihan (*Lunas*, *Belum Lunas*, *Tunggakan*) dengan pencetakan kwitansi digital.

* **1.3. Multi-Kategori Akun Usaha Pondok**
  * Pemisahan kasir: Kantin Asrama, Koperasi Santri, Toko Kitab, dan Layanan Laundry.

---

### 🟡 FASE 2: Digital Gatepass & Perizinan Santri (*Security & Disiplin*)

Fokus: Mengatasi masalah klasik pesantren terkait santri keluar komplek tanpa izin atau terlambat kembali (*overdue*).

* **2.1. Alur Perizinan Santri (Keluar Sebentar & Pulang ke Rumah)**
  * **Input Izin:** Pengurus Kamar / Bagian Keamanan membuat tiket izin melalui aplikasi (Alasan, Tanggal Keluar, Estimasi Jam Kembali, Nama Penjemput).
  * **Scan Gerbang (Gatepass Scan):** Petugas piket gerbang cukup memindai kartu QR/Barcode santri saat keluar dan saat kembali masuk asrama.

* **2.2. Realtime Board Keberadaan Santri**
  * Dashboard memantau status santri secara langsung:
    * 🟢 *Di Dalam Pondok*
    * 🟡 *Izin Keluar Komplek (Beli Kitab / Berobat)*
    * 🔵 *Izin Pulang ke Rumah (Liburan / Sambangan)*
    * 🔴 *Terlambat Kembali (Melewati batas jam izin / Overdue)*

* **2.3. Notifikasi WhatsApp Otomatis ke Wali Santri**
  * Notifikasi saat santri check-out gerbang (izin disetujui & keluar pondok).
  * Notifikasi saat santri kembali check-in gerbang dengan selamat.
  * Pengingat otomatis jika santri belum kembali saat mendekati batas waktu.

---

### 🔵 FASE 3: Modul Tahfidz Qur'an, Kitab Kuning, & Kesehatan (Poskestren)

Fokus: Pencatatan rekam capaian spiritual, akademik kepesantrenan, dan riwayat kesehatan.

* **3.1. Buku Mutaba'ah & Setoran Tahfidz Digital**
  * Pencatatan oleh Ustadz/Musyrif halaqah:
    * Jenis Setoran: *Ziyadah* (Hafalan Baru) atau *Muroja'ah* (Mengulang).
    * Parameter: Nama Surat, Juz, Rentang Ayat, Kualitas (*Mumtaz / Jayyid / Maqbul*), dan Catatan Tajwid/Makhraj.
  * Target Hafalan & Grafik Progres (Target Juz vs Capaian Riil).

* **3.2. Catatan Taklim & Kitab Kuning**
  * Absensi halaqah pengajian / madrasah diniyah pondok.
  * Pencatatan khataman kitab per semester.

* **3.3. Buku Pelanggaran & Poin Kedisiplinan (*Ta'zir*)**
  * Rekap pelanggaran santri (terlambat sholat berjamaah, bahasa, keluar tanpa izin).
  * Penghitungan akumulasi poin pelanggaran dan status pelaksanaan sanksi edukatif (*Ta'zir*).

* **3.4. Rekam Medis Poskestren / UKS Pondok**
  * Riwayat keluhan sakit santri, pemberian obat harian, dan status istirahat (Kamar Asrama / Ruang Rawat UKS / Rujukan RS).

---

### 🟣 FASE 4: Portal Terpadu Wali Santri & Multi-Role Dashboard

Fokus: Memberikan transparansi penuh dan ketenangan pikiran bagi orang tua santri di rumah.

* **4.1. Dashboard All-in-One Wali Santri**
  * Akses mobile-friendly tanpa login rumit (menggunakan NIS / Kode Khusus / OTP):
    1. **Tab Keuangan:** Saldo Uang Saku, Detail Belanja Kantin Hari Ini, Riwayat Tagihan SPP.
    2. **Tab Perizinan:** Status keberadaan santri di asrama dan riwayat izin keluar/pulang.
    3. **Tab Tahfidz:** Riwayat setoran hafalan terbaru dan capaian juz.
    4. **Tab Kesehatan & Catatan Pengasuh:** Rekam medis UKS dan pengumuman pondok.

* **4.2. Manajemen Role Pengguna Pesantren (RBAC)**
  * **Super Admin / Pengasuh Pondok:** Akses menyeluruh seluruh pondok.
  * **Bendahara Pondok:** Akses keuangan, SPP, dan tabungan santri.
  * **Kasir Kantin/Koperasi:** Akses POS Kasir & Transaksi.
  * **Petugas Keamanan / Piket:** Akses Scan Gatepass Perizinan.
  * **Ustadz / Musyrif Halaqah:** Akses Catatan Tahfidz & Kedisiplinan.
  * **Petugas UKS / Poskestren:** Akses Rekam Medis.

---

## 💾 Struktur Database Tambahan Konseptual (PostgreSQL / Supabase)

Berikut rancangan skema tabel database pendukung yang ringan, efisien, dan ramah kuota Supabase Free Tier:

```sql
-- 1. Tabel Konfigurasi & Limit Santri
ALTER TABLE students ADD COLUMN IF NOT EXISTS daily_spending_limit NUMERIC DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dormitory_room VARCHAR(100); -- Nama Kamar / Asrama
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_status VARCHAR(50) DEFAULT 'IN_CAMPUS'; -- IN_CAMPUS, PERMIT_OUT, HOME_VISIT

-- 2. Tabel Perizinan Santri (Gatepass)
CREATE TABLE IF NOT EXISTS student_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permit_type VARCHAR(50) NOT NULL, -- 'SHORT_EXIT', 'HOME_VISIT', 'MEDICAL'
  reason TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_return_time TIMESTAMPTZ NOT NULL,
  actual_return_time TIMESTAMPTZ,
  approver_name VARCHAR(150),
  security_checkout_by VARCHAR(150),
  security_checkin_by VARCHAR(150),
  status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RETURNED', 'OVERDUE'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Tagihan & SPP Santri (Billing / Syahriah)
CREATE TABLE IF NOT EXISTS student_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL, -- 'SPP Bulan Oktober 2026', 'Uang Pembangunan'
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  status VARCHAR(50) DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIAL', 'PAID'
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Setoran Tahfidz Al-Qur'an
CREATE TABLE IF NOT EXISTS tahfidz_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'ZIYADAH', 'MUROJA_AH'
  juz INTEGER NOT NULL,
  surah_name VARCHAR(100) NOT NULL,
  verse_range VARCHAR(50), -- 'Ayat 1-50'
  grade VARCHAR(50) DEFAULT 'MUMTAZ', -- 'MUMTAZ', 'JAYYID', 'MAQBUL'
  notes TEXT,
  ustadz_name VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Catatan Kesehatan Poskestren / UKS
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  complaint TEXT NOT NULL, -- Keluhan sakit
  diagnosis TEXT,
  treatment TEXT, -- Tindakan / Obat yang diberikan
  rest_location VARCHAR(100) DEFAULT 'DORMITORY', -- 'DORMITORY', 'UKS_ROOM', 'HOSPITAL'
  status VARCHAR(50) DEFAULT 'UNDER_CARE', -- 'UNDER_CARE', 'RECOVERED'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📌 Rekomendasi Langkah Selanjutnya

1. **Simpan blueprint ini** sebagai panduan baku pengembangan jangka pendek dan jangka panjang.
2. Saat Anda siap melanjutkan implementasi fitur, kita dapat memulai dari **Fase 1 (Limit Jajan Harian & Tagihan SPP)** terlebih dahulu agar modul finansial semakin matang sebelum masuk ke modul perizinan dan tahfidz.
