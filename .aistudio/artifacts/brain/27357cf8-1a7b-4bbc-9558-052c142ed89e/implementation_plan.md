# Rencana Implementasi: Isolasi & Penguncian Transaksi Siswa Berdasarkan Kode Sekolah (Kios ATM & Kantin) [SELESAI]

Seluruh fitur isolasi multi-tenant yang ketat untuk mencegah santri/siswa dari sekolah lain melakukan transaksi di Kios ATM maupun Kantin Sekolah telah berhasil diimplementasikan:

---

## 1. Fitur yang Telah Diimplementasikan

### A. Kios ATM Siswa (`/kiosk`) [SELESAI]
1. **Layar Kunci Kode Sekolah Wajib (School Code Gate):**
   - Saat Kios ATM dibuka pertama kali tanpa kode sekolah tersimpan, Kios secara otomatis mengunci pemindai dan menampilkan dialog modal wajib: *"Kunci Kios ATM Sekolah (Wajib)"*.
   - Dialog tidak dapat ditutup/dibatalkan sebelum kode sekolah dimasukkan dan divalidasi ke database via `verifySchoolCodeAction`.
   - Menolak kode sekolah yang salah atau tidak terdaftar di sistem dengan pesan yang jelas.
   - Setelah diverifikasi, nama sekolah dan kode sekolah tersimpan secara persisten di penyimpanan perangkat (`localStorage`) dan Kios ATM terbuka.
2. **Isolasi Pemindaian & Penarikan Saldo:**
   - Header Kios ATM selalu menampilkan identitas sekolah aktif: `Sekolah: [Nama Sekolah] ([KODE])`.
   - Disediakan tombol *"Kunci Sekolah"* untuk mengganti atau mereset sekolah terikat sewaktu-waktu.
   - Pemindaian QR / Barcode / Input NIS manual difilter secara ketat dengan `profiles.school_code = savedSchoolCode`.
   - Jika santri dari sekolah lain dipindai, Kios menolak dengan notifikasi tegas:
     `"Kartu siswa berasal dari sekolah lain ([KODE]). Kios ATM ini hanya melayani [Nama Sekolah]."`
   - Server Action `processKioskWithdrawal` memverifikasi ulang bahwa siswa yang ditarik saldonya benar-benar terdaftar di bawah `school_code` sekolah aktif.

### B. Kasir Kantin Sekolah (`/cantine`) [SELESAI]
1. **Pendeteksian Otomatis Sekolah Kantin:**
   - Kasir kantin otomatis mendeteksi kode sekolah dan nama sekolah dari akun kantin yang sedang login melalui `getCanteenSchoolInfoAction`.
   - Header kasir dan layar pemindaian POS menampilkan banner identitas sekolah:
     `"Khusus Santri: [Nama Sekolah] ([KODE])"`.
2. **Validasi & Pemblokiran Transaksi Lintas Sekolah:**
   - Fungsi verifikasi siswa `getStudentDataForPayment` memfilter santri secara eksklusif berdasarkan `profiles.school_code = merchantSchoolCode`.
   - Jika santri dari sekolah lain dipindai atau dimasukkan NIS-nya:
     `"Siswa [Nama] terdaftar di [Sekolah Lain]. Kantin [Nama Sekolah] hanya melayani santri dari sekolah Anda. Transaksi ditolak."`
   - Server Action pembayaran `processCantinePayment` melakukan verifikasi ganda di level database sebelum mendebet saldo tabungan siswa.

---

## 2. File & Modifikasi yang Diterapkan

1. `src/app/kiosk/actions.ts`:
   - Penambahan `verifySchoolCodeAction` untuk validasi kode sekolah ke tabel `profiles`.
   - Update `getStudentKioskData`: wajib menerima `schoolCode`, menggunakan `profiles.school_code`, dan memberikan pesan informatif jika siswa terdaftar di sekolah lain.
   - Update `processKioskWithdrawal`: verifikasi bahwa `student.profiles.school_code === schoolCode`.
2. `src/app/kiosk/page.tsx`:
   - Gerbang dialog wajib (School Code Gate) saat pertama kali buka kios.
   - Indikator sekolah aktif di header Kios ATM.
   - Validasi kecocokan kode sekolah saat pemindaian kartu dan pencarian manual.
3. `src/app/cantine/actions.ts`:
   - Penambahan `getCanteenSchoolInfoAction` untuk mengambil identitas sekolah akun kantin.
   - Update `getStudentDataForPayment`: otomatis menyaring siswa berdasarkan sekolah kantin yang sedang login dan menolak santri sekolah lain.
   - Update `processCantinePayment`: pemeriksaan integritas `merchantProfile.school_code === student.profiles.school_code`.
4. `src/app/cantine/payment/page.tsx`:
   - Integrasi identitas sekolah kantin pada header POS dan banner status scanner.
   - Pengiriman `canteenSchool.schoolCode` pada proses scan dan pembayaran.
