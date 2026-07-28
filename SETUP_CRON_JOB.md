# Cara Mencegah Proyek Supabase Gratis dari "Pause"

Proyek Supabase pada *free tier* akan otomatis dihentikan (pause) jika tidak ada aktivitas selama 7 hari. Untuk mencegah hal ini, kita bisa membuat "aktivitas palsu" dengan memanggil API aplikasi kita secara terjadwal.

Endpoint API `GET /api/ping` sudah dibuat di aplikasi ini untuk tujuan tersebut. Anda hanya perlu menggunakan layanan penjadwalan gratis untuk memanggil endpoint itu secara berkala.

Berikut adalah panduan menggunakan layanan **cron-job.org**.

---

### Langkah 1: Daftar di cron-job.org

1.  Buka situs [https://cron-job.org/](https://cron-job.org/).
2.  Klik **"Sign up for free"** dan buat akun baru. Prosesnya cepat dan hanya memerlukan email dan password.

### Langkah 2: Dapatkan URL Aplikasi Anda

1.  Pastikan aplikasi Anda sudah di-deploy dan memiliki URL publik.
2.  URL yang akan kita gunakan adalah:
    ```
    [URL_APLIKASI_ANDA]/api/ping
    ```
    Contoh: `https://aplikasi-tabungan-saya.vercel.app/api/ping`

### Langkah 3: Buat Cron Job Baru

1.  Setelah login ke dashboard cron-job.org, klik tombol hijau **"Create cronjob"**.
2.  Anda akan melihat sebuah form. Isi form tersebut seperti ini:

    *   **Title:** Beri nama yang mudah diingat, misalnya `Ping Supabase Tabungin`.
    *   **URL:** Masukkan URL lengkap dari Langkah 2.
        ```
        https://[URL_APLIKASI_ANDA]/api/ping
        ```
    *   **Schedule:** Atur jadwal eksekusi. Untuk mencegah Supabase pause, menjalankan ini **sekali sehari** atau **setiap beberapa hari** sudah lebih dari cukup.
        *   Pilih tab **"Every day"**.
        *   Biarkan pengaturan waktu default (misalnya `00:00`). Ini berarti cron job akan berjalan setiap hari pada tengah malam.

3.  Biarkan pengaturan lain (seperti "Request Method", "HTTP Auth", dll.) sebagai default.
4.  Klik tombol hijau **"Create"** untuk menyimpan.

---

### Selesai!

Itu saja! Sekarang, layanan cron-job akan secara otomatis "mengunjungi" endpoint `/api/ping` di aplikasi Anda sesuai jadwal. Setiap kunjungan akan menghasilkan query ringan ke database Supabase, yang akan dihitung sebagai aktivitas. Ini akan me-reset timer 7 hari dan menjaga proyek Supabase Anda tetap aktif.

Anda bisa memeriksa riwayat eksekusi di dashboard cron-job.org untuk memastikan semuanya berjalan lancar. Jika Anda mengklik log, Anda akan melihat respons JSON seperti `{ "message": "Supabase instance is active.", ... }` yang menandakan panggilan berhasil.
