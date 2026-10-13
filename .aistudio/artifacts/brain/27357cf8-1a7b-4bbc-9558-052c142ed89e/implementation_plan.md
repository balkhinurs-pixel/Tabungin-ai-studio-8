# Visualisasi Badge Cash & ATM serta Sistem Harga Modal & Keuntungan Kantin

Pembaruan ini meningkatkan estetika visual identitas transaksi (Cash bernuansa Emerald Green dan ATM bernuansa Banking Blue) di seluruh antarmuka kantin, serta menambahkan pencatatan **Harga Modal (Harga Asli)** di samping **Harga Jual** untuk menghitung estimasi laba kotor per porsi, margin persentase, dan total laba riwayat penjualan.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan yang telah dikonfirmasi:
> - **Warna Badge & Metode Pembayaran**: 
>   - **Cash (Tunai)**: Hijau emerald elegan (`emerald-600` / `emerald-700`, latar lembut `emerald-50`, border `emerald-200`).
>   - **ATM / Non-Tunai**: Biru perbankan modern (`blue-600` / `indigo-600`, latar lembut `blue-50`, border `blue-200`).
> - **Skema Harga Modal & Keuntungan**:
>   - Menambahkan input **Harga Modal (Beli/HPP)** di form tambah/edit menu (`/cantine/menu`).
>   - Menampilkan kalkulasi **Laba per Porsi (Rp)** dan **Margin (%)** langsung di kartu katalog menu.
>   - Menyajikan metrik **Estimasi Total Laba Bersih/Kotor** di ringkasan Laporan & Riwayat Transaksi (`/cantine/history`).
>   - Mendukung fallback aman (jika database belum memiliki kolom modal, sistem menyimpan dan menghitung secara mulus dengan estimasi cadangan tanpa mengganggu operasional kasir).

---

### 1. Overview & Core Concept

- **Apa Fungsinya**: 
  1. Memberikan diferensiasi visual yang kontras, segar, dan profesional antara pembayaran Cash (Tunai) dan ATM (Debit/RFID/Non-tunai) di kasir POS (`/cantine/payment`) dan riwayat laporan (`/cantine/history`).
  2. Memungkinkan pengelola kantin menentukan harga pokok penjualan (HPP / modal) dari setiap menu untuk mengetahui berapa laba bersih per produk yang terjual dan total keuntungan penjualan harian/bulanan.
- **Target Pengguna**: Kasir kantin, pemilik stand/outlet kantin, dan admin sekolah.
- **Nilai Utama**: Kasir tidak lagi bingung membedakan jenis transaksi secara cepat, dan pemilik kantin memiliki transparansi penuh atas keuntungan riil, bukan sekadar omzet kotor.

---

### 2. User Experience & Visual Design

#### A. Identitas Warna Metode Pembayaran
- **Cash (Tunai)**:
  - Badge Riwayat: Teks emerald pekat dengan latar hijau mint lembut, dilengkapi ikon uang/dompet (`Banknote`).
  - Tombol POS: Efek highlight emerald saat opsi Cash dipilih, aksen border tegas `border-emerald-500`, dan ring fokus lembut.
- **ATM (Non-Tunai / RFID Tabungan Siswa)**:
  - Badge Riwayat: Teks biru perbankan kobalt dengan latar biru lembut, dilengkapi ikon kartu/chip (`CreditCard`).
  - Tombol POS: Efek highlight biru perbankan saat ATM dipilih, aksen border tegas `border-blue-600`.

#### B. Pengelolaan Harga Modal & Keuntungan Menu (`/cantine/menu`)
- **Modal Form Tambah / Edit**:
  - Kolom **Harga Jual** (Harga yang dibayar siswa/pembeli).
  - Kolom baru **Harga Modal / Asli** (Biaya pokok belanja bahan atau harga titipan per porsi).
  - **Live Preview Laba**: Kotak kalkulator otomatis yang seketika menghitung `Laba = Harga Jual - Harga Modal` dan `Margin = (Laba / Harga Jual) * 100%`.
- **Kartu Produk di Katalog**:
  - Tampilan harga jelas dengan pemisahan:
    - Harga Jual: `Rp X.XXX` (tebal, visual primer).
    - Harga Modal: `Modal: Rp Y.YYY` (abu-abu teratur, `tabular-nums`).
    - Laba/Margin: `+Rp Z.ZZZ (M%)` dengan warna emerald positif.

#### C. Laporan & Riwayat Penjualan (`/cantine/history`)
- Menambahkan kartu ringkasan keuangan di atas tabel/daftar riwayat:
  - **Total Omzet Kotor** (Total pendapatan masuk).
  - **Estimasi Modal Terpakai** (HPP produk terjual).
  - **Estimasi Laba Kotor** (Omzet dikurangi modal).
- Setiap item transaksi yang diperluas menampilkan estimasi keuntungan produk tersebut.

---

### 3. Key Product Decisions & Trade-Offs

- **Penanganan Kolom `cost_price`**:
  - *Pendekatan*: Input harga modal disimpan di database (`cost_price` pada tabel `canteen_items`). Jika skema database belum memiliki kolom tersebut, kode server actions menangani fallback secara anggun tanpa crash dan tetap menampilkan kalkulasi modal berbasis data terkini.
  - *Alasan*: Menjamin keandalan transaksi kasir agar tidak pernah terganggu oleh perbedaan schema SQL runtime.
- **Keterbacaan Angka Finansial**:
  - Semua angka mata uang dan persentase menggunakan styling `tabular-nums font-mono` agar rata vertikal saat dibandingkan.
- **Kepatuhan Desain Anti-Slop**:
  - Menghindari kapsul pill bertumpuk; menggunakan pembatas tipis elegan, kontras warna yang nyaman untuk mata kasir yang bekerja berjam-jam, dan tipografi `Plus Jakarta Sans`.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       KASIR & PENGELOLA                     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      /cantine/payment        │ │       /cantine/menu        │
│ - Badge Cash: Emerald Green  │ │ - Input: Harga Jual & Modal│
│ - Badge ATM: Banking Blue    │ │ - Live Margin Preview      │
│ - Transaksi Berwarna Tegas   │ │ - Quick Stock & Margin Card│
└──────────────┬───────────────┘ └────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Server Actions (actions.ts)                 │
│ - addCanteenItemAction (terima cost_price)                  │
│ - updateCanteenItemAction (update cost_price)               │
│ - getCantineTransactionsAction (rekap omzet & estimasi laba)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      /cantine/history                       │
│ - KPI Cards: Total Omzet, Estimasi Modal, Total Laba Bersih │
│ - Filter Waktu (Hari Ini, 7 Hari, Bulan Ini)                │
│ - Tag Cash (Emerald) & ATM (Blue) Kontras & Rapi            │
└─────────────────────────────────────────────────────────────┘
```

- **Komponen yang Diperbarui**:
  1. `src/app/cantine/menu/page.tsx`: Form modal tambah/edit produk, kartu katalog menu dengan info modal & laba, kartu statistik total nilai modal & potensi omzet.
  2. `src/app/cantine/actions.ts`: Penanganan field `cost_price` pada operasi CRUD menu dan kalkulasi estimasi laba pada rekap riwayat.
  3. `src/app/cantine/history/page.tsx`: Pembaruan badge visual warna Cash (Emerald Green) dan ATM (Banking Blue), serta penambahan card rekapitulasi laba dan modal.
  4. `src/app/cantine/payment/page.tsx`: Penyelarasan visual badge metode pembayaran dan opsi checkout Cash vs Tabungan/ATM.
