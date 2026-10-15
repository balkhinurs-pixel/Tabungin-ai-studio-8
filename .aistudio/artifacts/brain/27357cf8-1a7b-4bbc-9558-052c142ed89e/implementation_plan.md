# Rencana Sinkronisasi PIN Siswa (Identitas, Tombol Kunci, Profil & WhatsApp)

Pengguna melaporkan bahwa saat mengubah PIN lewat formulir profil/identitas siswa atau tombol kunci, PIN tidak tersinkronisasi dan tetap kembali ke default `123456` saat membuka profil maupun saat mengirim data login lewat WhatsApp.

## Analisis Masalah

1. **Formulir Identitas Siswa (`EditStudentDialog` & `updateStudentAction`):**
   - Pada `updateStudentAction`, saat guru memasukkan 6 digit PIN baru, sistem memperbarui akun autentikasi Supabase tetapi **lupa memasukkan kolom `pin` ke dalam `updatePayload` tabel `students`**.
   - Akibatnya, data profil siswa di tabel `students` tidak pernah terisi nilai PIN baru, dan tetap bernilai `null` sehingga di fallback ke `123456`.
   - Input PIN pada form identitas saat dibuka masih kosong string (`''`), bukan menampilkan PIN aktif siswa saat ini.

2. **Tombol Kunci (Reset PIN di Tabel `ProfilesClientPage.tsx`):**
   - Dialog tombol kunci selalu memaksa nilai input menjadi hardcoded `'123456'` saat dibuka, bukan PIN aktif siswa.
   - Setelah reset berhasil, dialog tidak mengabari komponen tabel induk (`onStudentUpdated`) sehingga state siswa di tabel masih membawa PIN lama sebelum di-reload.

3. **Halaman Detail Profil (`/profiles/[id]`):**
   - Tombol "Reset PIN Siswa" (`ResetPinButton.tsx`) dan dialog kirim WhatsApp (`SendLoginWAButton.tsx`) belum memicu `router.refresh()`, sehingga kartu PIN aktif (`StudentActivePinCard`) dan pesan WA tidak langsung ter-update dengan data server terbaru tanpa refresh manual browser.

---

## Rencana Perubahan

### 1. Perbaikan Server Action (`src/app/(main)/profiles/actions.ts`)
- **Pada `updateStudentAction`**:
  - Ambil nilai `pin` dari `formData`.
  - Jika PIN diisi dan valid 6 digit angka:
    - Masukkan `updatePayload.pin = pin.trim()` ke dalam pembaruan tabel `students`.
    - Perbarui password autentikasi akun siswa di Supabase Admin.
  - Kembalikan data siswa lengkap terbaru (`updatedStudentData`) yang menyertakan nilai `pin` terkini.
  - Tambahkan `revalidatePath('/profiles')` dan `revalidatePath('/profiles/${id}')`.
- **Pada `resetStudentPinAction`**:
  - Pastikan `pinToSet` selalu tersimpan rapi di kolom `students.pin` serta mengembalikan objek hasil yang sinkron.

### 2. Sinkronisasi Formulir Identitas (`src/app/(main)/profiles/ProfilesClientPage.tsx`)
- **Pada `EditStudentDialog`**:
  - Isi state awal input PIN dengan PIN aktif siswa (`student.pin || '123456'`) sesuai preferensi pengguna.
  - Tambahkan tombol lihat/sembunyikan PIN (eye icon) dan tombol reset cepat.
  - Saat form disimpan, data siswa yang diperbarui di state tabel langsung mencerminkan PIN baru tersebut.

### 3. Sinkronisasi Tombol Kunci / Reset PIN di Tabel (`ProfilesClientPage.tsx`)
- **Pada `ResetPinDialog`**:
  - Tampilkan PIN aktif siswa saat dialog dibuka (`student.pin || '123456'`).
  - Setelah berhasil direset, panggil callback `onStudentUpdated` agar daftar siswa di tabel langsung memperbarui nilai `pin` siswa tersebut secara instan.

### 4. Sinkronisasi Halaman Detail Siswa (`src/app/(main)/profiles/[id]/`)
- **Pada `ResetPinButton.tsx`**:
  - Tambahkan hook `useRouter()` dari `next/navigation`.
  - Panggil `router.refresh()` segera setelah PIN berhasil direset agar Kartu PIN Aktif dan seluruh komponen halaman detail langsung menampilkan PIN baru.
- **Pada `SendLoginWAButton.tsx`**:
  - Tambahkan `router.refresh()` setelah berhasil mereset PIN atau memperbarui nomor WA dari dalam modal WA.
  - Pastikan teks template pesan WhatsApp selalu menggunakan PIN aktif terkini yang sinkron dengan kartu profil.

---

## Rencana Pengujian & Verifikasi

1. **Kompilasi Aplikasi**:
   - Jalankan `compile_applet` untuk memastikan seluruh tipe TypeScript, impor modul, dan komponen React valid tanpa error.
2. **Pengujian Alur Identitas (Ubah Profil Siswa)**:
   - Buka form ubah profil siswa, pastikan PIN aktif langsung tampil di kolom input.
   - Ubah PIN (misal `555555`), simpan.
   - Buka kembali tombol kunci, profil detail, atau kirim WA: pastikan PIN yang muncul adalah `555555` (bukan default `123456`).
3. **Pengujian Alur Tombol Kunci**:
   - Klik tombol kunci di tabel siswa, masukkan PIN baru (misal `888888`), klik Reset PIN.
   - Periksa bahwa state tabel dan pesan WA langsung sinkron menampilkan `888888`.
4. **Pengujian Halaman Detail Siswa**:
   - Buka halaman detail profil `/profiles/[id]`.
   - Cek `StudentActivePinCard`, tombol Reset PIN, dan tombol Kirim Akun Login WA agar saling sinkron secara real-time.
