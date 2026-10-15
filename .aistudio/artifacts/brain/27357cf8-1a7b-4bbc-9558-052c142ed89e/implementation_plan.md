# Fitur Pemantauan Saldo Siswa untuk Admin Pusat

Fitur ini memungkinkan Admin Pusat untuk memantau sisa saldo tabungan seluruh siswa di semua sekolah/guru secara terpusat, dengan filter sekolah, pencarian cepat, ringkasan total saldo, dan tabel data yang bersih serta responsif.

> [!IMPORTANT]
> **Keputusan Pengguna yang Dikonfirmasi (Fase Klarifikasi):**
> - **Penempatan Fitur**: Menu khusus **Saldo Siswa** di sidebar admin (`/admin/students`) lengkap dengan filter sekolah/guru.
> - **Format Tampilan & Informasi**: Tabel sederhana berfokus langsung pada **NIS, Nama Siswa, Kelas, Asal Sekolah/Guru, dan Nominal Sisa Saldo**, dilengkapi kartu statistik total saldo dan total siswa.

---

## 1. Overview & Core Concept

- **Apa yang Dibuat**: Halaman pemantauan saldo siswa khusus panel admin (`/admin/students`) yang menampilkan seluruh siswa terdaftar lintas sekolah beserta akumulasi sisa saldo terkininya.
- **Pengguna Sasaran**: Admin Pusat / Super Admin yang bertugas melakukan audit tabungan, memastikan transparansi kas digital, dan memonitor total dana tabungan santri/siswa yang tersimpan di sistem.
- **Nilai Utama**: Admin tidak perlu lagi login ke akun masing-masing guru atau memeriksa mutasi transaksi satu per satu untuk mengetahui saldo seorang siswa. Semua data tersaji dalam satu tampilan komprehensif dengan pencarian instan.

---

## 2. User Experience & Visual Design

Mengikuti prinsip *Universal Frontend Design Constitution* dan panduan *SaaS Dashboard*:

- **Navigasi Sidebar Admin**:
  - Penambahan menu baru **Saldo Siswa** dengan ikon `Wallet` / dompet pada sidebar desktop (`AdminSidebar`) dan bottom nav mobile (`AdminMobileBottomNav`).
  - Active state yang tegas saat rute berada di `/admin/students`.

- **Visual Header & Ringkasan Metrik (Header KPI Cards)**:
  - **Total Saldo Siswa**: Nilai agregat total uang tabungan seluruh siswa (`font-mono tabular-nums`).
  - **Total Siswa Terdaftar**: Jumlah siswa aktif lintas sekolah.
  - **Sekolah / Guru Aktif**: Jumlah akun pengelola sekolah yang memiliki siswa terdaftar.
  - **Rata-rata Saldo per Siswa**: Nilai rata-rata saldo per anak.

- **Filter & Kontrol Interaktif**:
  - **Filter Dropdown Sekolah**: Pilihan untuk menampilkan semua sekolah atau memfilter per akun sekolah/guru tertentu.
  - **Pencarian Real-Time**: Input pencarian cepat berdasarkan nama siswa, NIS, atau kelas.
  - **Sort Saldo**: Opsi pengurutan saldo tertinggi, terendah, atau alfabetis nama.

- **Tabel Saldo Siswa (Clean High-Density Grid)**:
  - Format tabel bersih tanpa pill berwarna berlebihan (zero-pill discipline).
  - Kolom tabel:
    1. **No / Identitas**: Nomor urut dan inisial avatar siswa.
    2. **NIS**: Nomor Induk Siswa dalam format monospace.
    3. **Nama Lengkap Siswa**: Teks tebal yang mudah dipindai.
    4. **Kelas**: Keterangan rombel/kelas siswa.
    5. **Sekolah / Akun Pengelola**: Asal sekolah atau email guru pemilik data.
    6. **Sisa Saldo (IDR)**: Teks tebal rata kanan dengan format mata uang Indonesia `font-mono tabular-nums` (misal: `Rp 150.000`), dengan warna netral/hijau lembut untuk saldo positif dan abu-abu untuk saldo nol.

- **Status Data Lengkap**:
  - *Populated State*: Tabel lengkap dengan paginasi halus atau scrolling responsif.
  - *Empty State*: Informasi ramah jika filter tidak menemukan siswa.
  - *Loading State*: Skeleton loader elegan saat pergantian filter sekolah.

---

## 3. Key Product Decisions & Trade-Offs

- **Perhitungan Saldo Secara Real-Time Server-Side**:
  - *Pendekatan*: Saldo dihitung langsung dari rumus baku aplikasi: `Pemasukan - Pengeluaran` dari relasi tabel `transactions` untuk setiap siswa, memastikan angka 100% sinkron dan akurat dengan buku tabungan guru.
  - *Keuntungan*: Tidak ada risiko desinkronisasi saldo akibat perbedaan cache; angka selalu mencerminkan mutasi riil.
- **Otorisasi Super Admin**:
  - *Pendekatan*: Memanfaatkan `getSupabaseAdmin()` di server action / server component admin sehingga dapat melintasi batasan RLS guru, dilindungi middleware layout admin yang memeriksa email `balkhinurs@gmail.com` dan role `ADMIN`.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Admin Panel                           │
│  /admin/students (Server Component + Supabase Admin)        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
    ┌────────────────────┐          ┌────────────────────┐
    │  profiles table    │          │  students table    │
    │  (Sekolah / Guru)  │          │  (NIS, Nama, dsb)  │
    └──────────┬─────────┘          └──────────┬─────────┘
               │                               │
               └───────────────┬───────────────┘
                               │ Left Join
                               ▼
                    ┌─────────────────────┐
                    │ transactions table  │
                    │ (Pemasukan/Keluar)  │
                    └──────────┬──────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ calculateBalance(student.transactions)       │
        │ Σ Pemasukan - Σ Pengeluaran                  │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
     ┌─────────────────────────────────────────────────────┐
     │ StudentBalancesClient (Interactive UI)              │
     │ - KPI Summary Cards (Total Saldo, Total Siswa)      │
     │ - School Filter Select + Realtime Search            │
     │ - Clean Tabular Table (NIS, Nama, Kelas, Saldo)     │
     └─────────────────────────────────────────────────────┘
```

### File-File yang Akan Dimodifikasi & Dibuat:
1. `src/app/admin/lib/constants.ts`: Menambahkan menu `Saldo Siswa` ke `ADMIN_NAV_ITEMS`.
2. `src/app/admin/students/page.tsx`: Server Component yang memuat data profil sekolah, siswa, dan transaksi menggunakan admin client.
3. `src/app/admin/students/StudentBalancesClient.tsx`: Client Component interaktif untuk filter sekolah, pencarian siswa, kalkulasi metrik ringkasan, dan tabel saldo responsif.
4. `src/app/admin/dashboard/page.tsx`: Menambahkan kartu shortcut cepat untuk melihat saldo siswa dari halaman dashboard utama admin.
