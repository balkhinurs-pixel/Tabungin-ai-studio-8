# Fitur Pengiriman Kredensial Login Siswa via WhatsApp

Rencana implementasi fitur bagi guru untuk mengirimkan informasi akun login santri/siswa (Nama, User/NIS, PIN, Kode Sekolah, dan Alamat Tautan Login Langsung) ke nomor WhatsApp wali murid dengan sekali klik melalui web redirect WhatsApp (`wa.me`).

## User Review Required

> [!IMPORTANT]
> Fitur ini ditempatkan secara eksklusif di halaman **Detail Profil Siswa (`/profiles/[id]`)** sesuai preferensi Anda. Karena Supabase Auth mengenkripsi kata sandi/PIN satu arah (hashing demi keamanan data), dialog ini menyediakan opsi bagi guru untuk mengonfirmasi atau mengatur PIN baru (misal jika siswa lupa PIN). Sistem akan otomatis memperbarui PIN di server autentikasi dan langsung membuat pesan WhatsApp terformat rapi dengan link login instan yang langsung terisi NIS & Kode Sekolah.

---

## Arsitektur & Alur Kerja Fitur

```
Guru membuka /profiles/[id]
         │
         ▼
Klik tombol "Kirim Akun Login via WA"
         │
         ▼
Muncul Dialog:
 ├── Ringkasan: Nama Siswa, NIS, Kode Sekolah
 ├── Input PIN (default 123456 atau ketik PIN baru jika lupa)
 ├── Nomor WhatsApp Wali (otomatis terisi / bisa diedit)
 └── Live Preview Pesan WhatsApp
         │
         ▼
Klik "Kirim ke WhatsApp"
 ├── Memperbarui PIN siswa di auth (resetStudentPinAction)
 └── Membuka URL wa.me/... di tab baru (otomatis membuka WhatsApp Web / Aplikasi WA)
```

---

## Komponen & Perubahan yang Direncanakan

### 1. Komponen Baru: `SendLoginWAButton.tsx`
- **Lokasi**: `/src/app/(main)/profiles/[id]/_components/SendLoginWAButton.tsx`
- **Tampilan Tombol**: Tombol bergaya modern dengan warna khas WhatsApp (latar hijau emerald, ikon kunci/pesan WhatsApp `KeyRound` / `MessageCircle`, label *"Kirim Akun Login via WA"*).
- **Dialog Modal**:
  - Tampilan kredensial: Nama Siswa, Kelas, NIS (Username), Kode Sekolah (`school_code`).
  - Input PIN 6 digit (tersedia tombol cepat *"Gunakan 123456"* dan validasi angka).
  - Input Nomor WhatsApp tujuan (mengambil nomor wali dari database, guru dapat mengubah jika diperlukan).
  - Opsi simpan nomor WA baru ke profil siswa jika guru memperbarui nomor di dialog.
  - Kotak Pratinjau Pesan yang rapi dan elegan sebelum dikirim.
  - Tombol *"Buka WhatsApp"* yang otomatis mengarahkan ke `https://wa.me/{nomor}?text={pesan}`.

### 2. Format Pesan WhatsApp
Format pesan yang dihasilkan akan profesional dan mudah dibaca oleh wali murid:
```text
Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari *[Nama Siswa]*

Berikut informasi akun login santri/siswa untuk aplikasi Tabung.in:
━━━━━━━━━━━━━━━━━━━━
👤 *Nama Siswa:* [Nama Siswa]
🏫 *Kode Sekolah:* [Kode Sekolah]
🆔 *User / NIS:* [NIS]
🔑 *PIN Masuk:* [PIN]
━━━━━━━━━━━━━━━━━━━━

🌐 *Alamat Login Langsung Siswa:*
https://[domain-aplikasi]/student-login?school_code=[KODE_SEKOLAH]&nis=[NIS]

*(Klik link di atas untuk langsung membuka layar input PIN santri tanpa perlu mengetik ulang NIS)*

Simpan informasi login ini dengan baik.
Terima kasih.
```

### 3. Integrasi di Halaman Detail Profil Siswa
- **Lokasi**: `/src/app/(main)/profiles/[id]/page.tsx`
- Mengambil data profil guru untuk membaca atribut `school_code`.
- Menyematkan `<SendLoginWAButton>` di bagian *"Laporan & Keamanan Akun"*, berdampingan secara harmonis dengan tombol laporan saldo dan tombol reset PIN.

---

## Rencana Verifikasi
1. **Pengujian Tampilan**: Memastikan tombol tampil rapi, responsif di mobile dan desktop.
2. **Pengujian Update PIN**: Menguji input PIN baru, memastikan tersimpan ke Supabase auth via Server Action.
3. **Pengujian URL Tautan**: Memastikan link login yang disertakan memuat `school_code` dan `nis` yang benar sehingga membuka mode PIN keypad saat diklik siswa.
4. **Verifikasi Build**: Menjalankan pengujian sintaksis dan kompilasi untuk memastikan tidak ada regresi.
