# Rencana Implementasi: Tampilkan PIN Aktif Siswa & Kirim Akun via WA Tanpa Reset

Berdasarkan kebutuhan Anda:
1. Siswa yang mengganti PIN (misal `555555`) dapat dilihat PIN aktifnya oleh Guru/Admin tanpa harus mereset PIN.
2. Pengiriman pesan WhatsApp akun login siswa secara otomatis menggunakan PIN aktif saat ini tanpa mereset PIN.
3. Tetap tersedia opsi opsional jika sewaktu-waktu guru memang berniat mereset PIN siswa.

---

## 1. Analisis Masalah & Kebutuhan
- **Kondisi Sebelumnya:**
  - Saat siswa mengganti PIN di `/home` (`changeStudentPinAction`), sistem hanya memperbarui kata sandi di Supabase Auth (yang di-*hash* satu arah), sehingga nilai teks PIN tidak tersimpan di tabel `students`.
  - Tombol WhatsApp (`SendLoginWAButton`) sebelumnya memaksakan reset PIN ke `123456` setiap kali pesan dikirim.
  - Kartu profil siswa belum menampilkan PIN aktif siswa secara langsung.

- **Solusi yang Diterapkan:**
  - Menjadikan kolom `pin` pada tabel `students` sebagai sumber sinkronisasi dua arah (saat siswa ganti PIN, saat siswa baru dibuat, dan saat guru mereset PIN).
  - Menampilkan PIN aktif di kartu detail profil siswa dengan tombol intip (eye toggle) & salin PIN.
  - Memperbarui dialog Kirim WA agar secara bawaan (*default*) mengirimkan PIN aktif siswa tanpa mereset akun, disertai opsi opsional (*toggle*) untuk mereset PIN jika memang diinginkan.

---

## 2. Rencana Perubahan Komponen & Kode

### A. Sinkronisasi Data PIN (`students.pin`)
1. **Perbarui `src/types/index.ts`:**
   - Tambahkan properti `pin?: string | null;` ke antarmuka `Student`.
2. **Sinkronkan saat Siswa Ganti PIN (`src/app/(student)/home/actions.ts`):**
   - Pada `changeStudentPinAction`, selain memperbarui password Auth Supabase, perbarui juga kolom `pin: cleanPin` pada tabel `students` untuk `id = user.id`.
3. **Sinkronkan saat Guru Tambah Siswa (`src/app/(main)/profiles/actions.ts`):**
   - Pada `addStudentAction`, sertakan `pin: newPin || '123456'` saat memasukkan baris baru ke tabel `students`.
4. **Sinkronkan saat Guru Reset PIN (`src/app/(main)/profiles/actions.ts`):**
   - Pada `resetStudentPinAction`, sertakan pembaruan `pin: pinToSet` pada tabel `students`.
5. **Action Pembantu Simpan Nomor WA (`src/app/(main)/profiles/actions.ts`):**
   - Buat fungsi aksi terpisah `updateStudentWhatsappAction(studentId, whatsappNumber)` agar saat mengirim pesan WA tanpa reset, nomor kontak wali tetap dapat diperbarui tanpa mengubah kredensial PIN siswa.

### B. Tampilan PIN Aktif di Kartu Profil Siswa
1. **Komponen PIN Viewer di Halaman Profil (`src/app/(main)/profiles/[id]/page.tsx`):**
   - Tampilkan badge/kartu informasi PIN aktif santri pada bagian info akun siswa.
   - Berikan tombol intip/sembunyikan (ikon mata `Eye` / `EyeOff`) agar PIN tetap aman namun mudah dilihat guru saat siswa lupa.
   - Tambahkan tombol salin PIN cepat dengan feedback visual (*toast*).

### C. Pembaruan Dialog Kirim WhatsApp (`SendLoginWAButton.tsx`)
1. **Otomatis Gunakan PIN Aktif:**
   - State awal PIN mengambil nilai `student.pin || '123456'`.
   - Pesan WhatsApp langsung memuat PIN aktif siswa tersebut.
2. **Kirim Tanpa Reset (Default):**
   - Guru cukup menekan tombol "Kirim ke WhatsApp". Sistem tidak akan mereset password siswa di server, sehingga PIN yang sudah diubah siswa (misal `555555`) tetap aktif dan tidak berubah.
3. **Pilihan Opsional Reset PIN:**
   - Disediakan toggle/checkbox: *"Reset atau buat PIN baru untuk siswa ini"*.
   - Hanya jika toggle ini dicentang oleh guru, sistem akan menjalankan `resetStudentPinAction` dengan nilai PIN baru.

---

## 3. Langkah Verifikasi & Pengujian
1. **Cek Ganti PIN Siswa:**
   - Memastikan saat siswa mengubah PIN, nilai `pin` tersimpan di Supabase dan langsung terbaca oleh guru.
2. **Cek Halaman Detail Profil Siswa:**
   - Memverifikasi tampilan PIN aktif dengan tombol intip/sembunyikan di `/profiles/[id]`.
3. **Cek Dialog WhatsApp:**
   - Memverifikasi pesan WhatsApp menggunakan PIN aktif siswa (`555555`).
   - Memverifikasi pengiriman WA tanpa mereset PIN (PIN tetap tidak berubah).
   - Memverifikasi opsi reset PIN berfungsi jika guru memilih untuk mereset.
4. **Validasi Build:**
   - Menjalankan `compile_applet` untuk memastikan tidak ada kesalahan TypeScript atau kompilasi.
