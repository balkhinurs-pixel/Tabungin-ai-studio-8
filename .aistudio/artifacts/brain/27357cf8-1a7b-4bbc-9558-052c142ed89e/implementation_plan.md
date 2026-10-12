# Alur Transaksi Tunai Tanpa Scan Kartu di Kantin

Menyediakan opsi pembayaran tunai (cash) langsung di POS Kasir Kantin tanpa kewajiban scan kartu santri/kartu tabungan, dengan opsi identitas pembeli fleksibel (Pembeli Umum, Tamu, Guru, atau nama manual), pemotongan stok otomatis, dan pemisahan pembukuan kas fisik vs saldo digital.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pertanyaan klarifikasi:
> - **Identitas Pembeli**: Kasir dapat memilih label cepat (*Pembeli Umum*, *Tamu*, *Guru/Staf*) atau mengetik nama pembeli secara manual.
> - **Manajemen Stok & Kas**: Transaksi tunai tetap otomatis memotong stok barang di inventaris kantin dan langsung masuk ke pembukuan uang fisik (kas laci outlet).

- **Confirmed Decision 1**: Transaksi cash tanpa scan kartu sepenuhnya didukung dan tidak membutuhkan data siswa/PIN.
- **Confirmed Decision 2**: Stok barang langsung berkurang secara *real-time* saat transaksi tunai selesai.
- **Confirmed Decision 3**: Struk pembayaran dan laporan harian membedakan uang kas di laci kantin dan piutang/settlement dari tabungan digital siswa.

---

## 1. Overview & Core Concept

- **Apa Fungsinya**: Memungkinkan kasir melayani transaksi langsung dari pembeli yang tidak membawa atau tidak memiliki kartu RFID/QR (misalnya tamu luar, wali santri, guru, atau santri yang membawa uang tunai fisik).
- **Target Pengguna**: Kasir & Pengelola Kantin Sekolah / Pesantren.
- **Nilai Utama**: Fleksibilitas tinggi bagi kasir tanpa hambatan kartu, stok barang tetap sinkron dan akurat, serta uang fisik di laci kasir tercatat terpisah dan rapi saat tutup buku/shift.

---

## 2. User Experience & Visual Design

### Alur Transaksi Kasir
1. **Pilih Menu & Keranjang**: Kasir memilih makanan/minuman dari katalog (stok terpantau langsung).
2. **Pilih Metode Pembayaran**:
   - `Tabungan Siswa`: Membutuhkan Scan Kartu / Barcode / NIS + PIN.
   - `Tunai (Cash)`: Langsung ke layar hitung uang tunai tanpa perlu kartu.
3. **Pilihan Identitas Pembeli**:
   - Pilihan chip cepat: `Pembeli Umum`, `Tamu`, `Guru / Staf`, `Siswa Tunai`.
   - Input teks opsional untuk nama pembeli tertentu.
4. **Hitung Uang & Kembalian**:
   - Tombol nominal cepat: *Uang Pas*, *Rp 10.000*, *Rp 20.000*, *Rp 50.000*, *Rp 100.000*.
   - Kalkulasi kembalian otomatis dengan teks kontras tinggi (hijau/hitam pekat).
5. **Konfirmasi & Cetak Struk**:
   - Struk thermal kasir mencantumkan: `METODE: TUNAI (CASH)`, `PEMBELI: UMUM / [NAMA]`, total belanja, uang diterima, dan uang kembalian.
   - Warna hitam pekat untuk cetak thermal yang tajam dan jelas.

### Estetika & Tampilan (SaaS POS Dashboard)
- **Palette**: Kanvas bersih, aksen emerald profesional untuk kasir (`emerald-600`), kartu ringkasan dengan pembatas halus (*hairline border*).
- **Tipografi**: Menggunakan `tabular-nums` untuk semua angka rupiah dan jumlah stok agar angka tidak bergeser saat input.
- **Status Transaksi**: Badge pembeda yang jelas di riwayat antara transaksi `TUNAI` (uang fisik di laci kasir) dan `TABUNGAN` (saldo digital).

---

## 3. Key Product Decisions & Trade-Offs

- **Pemisahan Jalur Transaksi**:
  - *Pendekatan*: Transaksi tunai mencatat `user_id` merchant, `is_settled: true`, dan `student_id: null`.
  - *Alasan*: Menghindari ketergantungan pada akun siswa atau batasan harian uang saku santri saat pembeli adalah umum/guru.
- **Pelacakan Stok Terpadu**:
  - *Pendekatan*: Mengurangi tabel inventaris `canteen_items` yang sama untuk kedua metode pembayaran.
  - *Alasan*: Mencegah selisih stok fisik antara barang yang dibeli dengan tabungan vs uang tunai.
- **Audit & Penutupan Kas Harian (Shift Closing)**:
  - *Pendekatan*: Laporan rekap harian membagi omzet menjadi:
    1. Kas Fisik (harus cocok dengan isi laci kasir).
    2. Piutang Non-Tunai (yang akan dicairkan/disettle oleh bendahara sekolah).

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   POS KASIR KANTIN (UI)                     │
│  [Katalog Barang]  ──>  [Keranjang Belanja]                 │
│                                │                            │
│                   Pilih Metode Pembayaran                   │
│                                │                            │
│           ┌────────────────────┴────────────────────┐       │
│           ▼                                         ▼       │
│    [Tabungan Siswa]                          [Tunai / Cash] │
│    - Scan Kartu                              - Tanpa Kartu  │
│    - Verifikasi PIN                          - Opsi Pembeli │
│    - Cek Limit Harian                        - Hitung Kas   │
│           │                                         │       │
└───────────┼─────────────────────────────────────────┼───────┘
            │                                         │
            ▼                                         ▼
 ┌──────────────────────┐                  ┌──────────────────────┐
 │processCantinePayment │                  │processCashPayment    │
 └──────────┬───────────┘                  └──────────┬───────────┘
            │                                         │
            ▼                                         ▼
 ┌────────────────────────────────────────────────────────────┐
 │                  SUPABASE DATABASE                         │
 │ - canteen_items: Stok terpotong otomatis (newStock)        │
 │ - transactions: Record tercatat (Tunai vs Tabungan)        │
 │ - Rekap harian kantin: Total Kas Fisik vs Klaim Non-Tunai  │
 └────────────────────────────────────────────────────────────┘
```

### Komponen & Modifikasi Teknis
1. **Halaman POS Kasir (`/cantine/payment/page.tsx`)**:
   - Memastikan tombol identitas cepat (*Pembeli Umum*, *Tamu*, *Guru*, dll.) tersedia dengan UX 1-klik di layar Tunai.
   - Memastikan tombol nominal uang cepat bekerja instan dan responsif.
   - Struk thermal cetak hitam solid (`textColor: [0, 0, 0]`) yang memuat rincian tunai.
2. **Action Server (`/cantine/actions.ts`)**:
   - Memvalidasi dan mengeksekusi `processCashPaymentAction` dengan pengurangan stok aman dan pencatatan transaksi kasir.
3. **Laporan & Rekap (`/cantine/history/page.tsx`)**:
   - Menyajikan pembagian total omzet: *Kas Fisik Masuk Laci* vs *Non-Tunai Masuk Rekening Tabungan*.
