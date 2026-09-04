'use server';

import type { Student } from '@/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

interface ActionResult {
  success: boolean;
  message: string;
  student?: Student;
}

export async function addStudentAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = createClient();

  // 1. Get current user and their profile using the user's cookie-based client
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Anda harus masuk untuk menambahkan siswa.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_code, plan, custom_quota')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.school_code) {
    return { success: false, message: 'Kode sekolah Anda belum diatur. Mohon atur di halaman Pengaturan.' };
  }

  // 2. Check student quota (hanya menghitung siswa yang aktif, tidak diarsipkan)
  const { count: studentCount, error: countError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('nis', 'like', '%_arc_%');

  if (countError) {
    return { success: false, message: `Gagal memeriksa kuota siswa: ${countError.message}` };
  }

  // Prioritas kuota: custom_quota > plan PRO (40) > default TRIAL (5)
  const studentQuota = profile.custom_quota || (profile.plan === 'PRO' ? 40 : 5);
  
  if (studentCount != null && studentCount >= studentQuota) {
    return { success: false, message: `Kuota siswa penuh. Batas untuk akun Anda adalah ${studentQuota} siswa.` };
  }

  // 3. Get form data
  const newNis = formData.get('nis') as string;
  const newName = formData.get('name') as string;
  const newStudentClass = formData.get('class') as string;
  // Gunakan fallback 123456 jika PIN kosong
  const newPin = (formData.get('pin') as string) || '123456';
  const newWhatsappNumber = formData.get('whatsapp_number') as string | null;
  const rawDailyLimit = formData.get('daily_limit') as string | null;
  const daily_limit = rawDailyLimit && rawDailyLimit.trim() !== '' ? parseInt(rawDailyLimit.replace(/\D/g, '')) : null;

  if (!newNis || !newName || !newStudentClass) {
    return { success: false, message: 'Data tidak lengkap. Mohon isi NIS, Nama, dan Kelas.' };
  }
  
  // 4. Get Admin client ONLY when needed
  const supabaseAdmin = getSupabaseAdmin();
  // FORCE lowercase on school code to prevent login issues
  const shadowEmail = `${newNis}@${profile.school_code.toLowerCase()}.supabase.user`;
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: shadowEmail,
    password: newPin,
    email_confirm: true, // Auto-confirm the shadow email
  });

  if (authError) {
    const errorMessage = authError.message.includes('unique')
      ? 'Kombinasi NIS dan Kode Sekolah ini sudah terdaftar.'
      : `Gagal membuat akun siswa: ${authError.message}`;
    return { success: false, message: errorMessage };
  }
  
  if (!authData.user) {
    return { success: false, message: 'Gagal membuat pengguna di sistem autentikasi.' };
  }

  // 5. Create student profile in 'students' table using the standard client
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .insert({
      id: authData.user.id, // Use the auth user ID as the student ID
      nis: newNis,
      name: newName,
      class: newStudentClass,
      user_id: user.id, // The admin/teacher user_id who created the student
      whatsapp_number: newWhatsappNumber,
      daily_limit: daily_limit || null
    })
    .select()
    .single();

  if (studentError) {
    // IMPORTANT: If student insert fails, we must delete the created auth user to avoid orphans
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    const errorMessage = studentError.code === '23505'
        ? 'NIS ini sudah digunakan. Mohon gunakan NIS yang lain.'
        : `Gagal menyimpan profil siswa: ${studentError.message}`;
    return { success: false, message: errorMessage };
  }

  // 6. Success! Revalidate the path and return success
  revalidatePath('/profiles');
  return {
    success: true,
    message: `Siswa baru dengan nama ${newName} berhasil ditambahkan.`,
    student: { ...studentData, transactions: [] } // Add empty transactions to match type
  };
}


export async function resetStudentPinAction(
  studentId: string,
  customPin?: string
): Promise<{ success: boolean; message: string; pin?: string }> {
  if (!studentId) {
    return { success: false, message: 'ID Siswa tidak valid.' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Anda harus masuk untuk mereset PIN siswa.' };
  }

  // 1. Ambil data siswa
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, nis, name, class, user_id, whatsapp_number')
    .eq('id', studentId)
    .single();

  if (studentError || !student) {
    return { success: false, message: 'Data siswa tidak ditemukan.' };
  }

  // 2. Ambil profil guru/admin untuk mendapatkan school_code
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_code')
    .eq('id', student.user_id)
    .single();

  if (!profile || !profile.school_code) {
    return { success: false, message: 'Kode sekolah tidak ditemukan.' };
  }

  // 3. Tentukan PIN yang akan digunakan (default 123456 jika tidak diisi)
  const pinToSet = customPin && customPin.trim().length > 0 ? customPin.trim() : '123456';
  
  if (pinToSet.length !== 6 || !/^\d{6}$/.test(pinToSet)) {
    return { success: false, message: 'PIN harus terdiri dari tepat 6 digit angka.' };
  }

  const cleanNis = student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis;
  const shadowEmail = `${cleanNis}@${profile.school_code.toLowerCase().trim()}.supabase.user`;
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 4. Coba perbarui password dan email auth user yang ada
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      studentId,
      {
        password: pinToSet,
        email: shadowEmail,
        email_confirm: true
      }
    );

    // 5. Jika auth user belum ada (misal data lama), buatkan auth user baru
    if (updateError) {
      if (updateError.message?.toLowerCase().includes('not found') || updateError.status === 404) {
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: studentId,
          email: shadowEmail,
          password: pinToSet,
          email_confirm: true
        });

        if (createError) {
          return { success: false, message: `Gagal membuat akun autentikasi siswa: ${createError.message}` };
        }
      } else {
        return { success: false, message: `Gagal mereset PIN: ${updateError.message}` };
      }
    }

    revalidatePath('/profiles');
    revalidatePath(`/profiles/${studentId}`);
    revalidatePath('/home');

    return {
      success: true,
      message: `PIN untuk siswa ${student.name} berhasil direset ke: ${pinToSet}`,
      pin: pinToSet
    };
  } catch (err: any) {
    console.error('Error resetting student PIN:', err);
    return { success: false, message: `Terjadi kesalahan saat mereset PIN: ${err.message || err}` };
  }
}

export async function updateStudentAction(
  formData: FormData
): Promise<ActionResult> {
    const supabase = createClient();
    const id = formData.get('id') as string;
    const nis = formData.get('nis') as string;
    const name = formData.get('name') as string;
    const studentClass = formData.get('class') as string;
    const whatsapp_number = formData.get('whatsapp_number') as string | null;
    const pin = formData.get('pin') as string;
    const rawDailyLimit = formData.get('daily_limit') as string | null;
    const daily_limit = rawDailyLimit !== null && rawDailyLimit.trim() !== '' ? parseInt(rawDailyLimit.replace(/\D/g, '')) : null;

    if (!id || !nis || !name || !studentClass) {
        return { success: false, message: 'Data tidak lengkap. Mohon isi NIS, Nama, dan Kelas.' };
    }

    // 1. Update the public student profile
    const { data: updatedStudentData, error: updateStudentError } = await supabase
        .from('students')
        .update({ nis, name, class: studentClass, whatsapp_number, daily_limit })
        .eq('id', id)
        .select()
        .single();

    if (updateStudentError) {
        const errorMessage = updateStudentError.code === '23505' 
            ? 'NIS ini sudah digunakan oleh siswa lain.'
            : `Gagal memperbarui profil siswa: ${updateStudentError.message}`;
        return { success: false, message: errorMessage };
    }

    // 2. Dapatkan profil sekolah untuk sinkronisasi shadow email & PIN di Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('school_code')
            .eq('id', user.id)
            .single();

        if (profile?.school_code) {
            const shadowEmail = `${nis}@${profile.school_code.toLowerCase().trim()}.supabase.user`;
            const supabaseAdmin = getSupabaseAdmin();
            
            const authUpdatePayload: { email: string; email_confirm: boolean; password?: string } = {
                email: shadowEmail,
                email_confirm: true,
            };

            if (pin && pin.trim().length > 0) {
                authUpdatePayload.password = pin.trim();
            }

            const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
                id,
                authUpdatePayload
            );

            // Jika user auth belum ada, buatkan otomatis
            if (updateUserError) {
                if (updateUserError.message?.toLowerCase().includes('not found')) {
                    await supabaseAdmin.auth.admin.createUser({
                        id: id,
                        email: shadowEmail,
                        password: pin && pin.trim().length > 0 ? pin.trim() : '123456',
                        email_confirm: true
                    });
                } else if (pin && pin.trim().length > 0) {
                    return { success: false, message: `Profil siswa diperbarui, tetapi gagal mereset PIN: ${updateUserError.message}` };
                }
            }
        }
    }

    // 3. Success
    revalidatePath('/profiles');
    revalidatePath(`/profiles/${id}`);
    revalidatePath('/home');
    return {
        success: true,
        message: `Data siswa ${name} berhasil diperbarui.`,
        student: { ...updatedStudentData, transactions: [] }
    };
}


export async function deleteStudentAction(
  studentId: string
): Promise<{success: boolean; message: string;}> {
    if (!studentId) {
        return { success: false, message: 'ID Siswa tidak ditemukan.' };
    }
    
    const supabaseAdmin = getSupabaseAdmin();

    try {
        // 1. Hapus transaksi terkait siswa
        const { error: transErr } = await supabaseAdmin
            .from('transactions')
            .delete()
            .eq('student_id', studentId);
            
        if (transErr) {
            console.error('Warning deleting student transactions:', transErr.message);
        }

        // 2. Hapus baris di tabel public.students
        const { error: studentErr } = await supabaseAdmin
            .from('students')
            .delete()
            .eq('id', studentId);

        if (studentErr) {
            return { success: false, message: `Gagal menghapus data siswa dari database: ${studentErr.message}` };
        }

        // 3. Hapus profil terkait di tabel public.profiles (jika ada)
        await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', studentId);

        // 4. Hapus akun autentikasi di auth.users (abaikan jika user sudah terhapus)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId);

        if (authError && !authError.message?.toLowerCase().includes('not found')) {
            console.warn(`Auth user delete warning for ${studentId}:`, authError.message);
        }

        revalidatePath('/profiles');
        revalidatePath('/dashboard');
        return {
            success: true,
            message: 'Siswa telah dihapus secara permanen.'
        };
    } catch (err: any) {
        return { success: false, message: `Gagal menghapus siswa: ${err.message || err}` };
    }
}


export async function archiveStudentAction(
  studentId: string
): Promise<{success: boolean; message: string;}> {
    if (!studentId) {
        return { success: false, message: 'ID Siswa tidak ditemukan.' };
    }

    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();

    try {
        // 1. Ambil data siswa saat ini
        const { data: student, error: studentFetchErr } = await supabase
            .from('students')
            .select('nis, name, class, user_id')
            .eq('id', studentId)
            .single();

        if (studentFetchErr || !student) {
            return { success: false, message: `Gagal mengambil data siswa: ${studentFetchErr?.message || 'Data tidak ditemukan'}` };
        }

        // Cek jika sudah diarsipkan sebelumnya
        if (student.nis.includes('_arc_')) {
            return { success: false, message: 'Siswa ini sudah berada di dalam arsip.' };
        }

        // 2. Dapatkan profil guru/sekolah untuk menyusun domain email bayangan
        const { data: profile } = await supabase
            .from('profiles')
            .select('school_code')
            .eq('id', student.user_id)
            .single();

        if (!profile || !profile.school_code) {
            return { success: false, message: 'Kode sekolah tidak ditemukan.' };
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const originalNis = student.nis;
        const archivedNis = `${originalNis}_arc_${timestamp}`;
        const archivedName = `${student.name} (Diarsipkan)`;
        const archivedEmail = `${archivedNis}@${profile.school_code.toLowerCase()}.supabase.user`;
        const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // 3. Update Auth User: ganti email bayangan dan ganti PIN secara acak agar siswa tidak bisa login lagi
        const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
            studentId,
            { 
                email: archivedEmail,
                password: randomPassword
            }
        );

        if (authUpdateErr) {
            return { success: false, message: `Gagal memperbarui data autentikasi arsip: ${authUpdateErr.message}` };
        }

        // 4. Update data profil di tabel students (mengganti NIS dan Nama)
        const { error: studentUpdateErr } = await supabase
            .from('students')
            .update({
                nis: archivedNis,
                name: archivedName
            })
            .eq('id', studentId);

        if (studentUpdateErr) {
            return { success: false, message: `Gagal memperbarui profil siswa di database: ${studentUpdateErr.message}` };
        }

        revalidatePath('/profiles');
        return {
            success: true,
            message: `Siswa ${student.name} berhasil diarsipkan. NIS ${originalNis} sekarang bebas dan dapat digunakan ulang.`
        };
    } catch (err: any) {
        return { success: false, message: `Gagal mengarsipkan: ${err.message || err}` };
    }
}


export async function restoreStudentAction(
  studentId: string
): Promise<{success: boolean; message: string;}> {
    if (!studentId) {
        return { success: false, message: 'ID Siswa tidak ditemukan.' };
    }

    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();

    try {
        // 1. Ambil data siswa dari database
        const { data: student, error: studentFetchErr } = await supabase
            .from('students')
            .select('nis, name, class, user_id')
            .eq('id', studentId)
            .single();

        if (studentFetchErr || !student) {
            return { success: false, message: `Gagal mengambil data siswa: ${studentFetchErr?.message || 'Data tidak ditemukan'}` };
        }

        // Pastikan siswa memang diarsipkan
        if (!student.nis.includes('_arc_')) {
            return { success: false, message: 'Siswa ini bukan siswa arsip.' };
        }

        // Ekstrak NIS asli (menghilangkan suffix _arc_1723...)
        const originalNis = student.nis.split('_arc_')[0];
        
        // 2. Periksa apakah NIS asli sudah digunakan oleh siswa aktif lain
        const { data: duplicateActive, error: dupError } = await supabase
            .from('students')
            .select('id, name')
            .eq('user_id', student.user_id)
            .eq('nis', originalNis)
            .maybeSingle();

        if (duplicateActive) {
            return { 
                success: false, 
                message: `Gagal memulihkan. NIS asli (${originalNis}) sudah terdaftar pada siswa aktif lain bernama "${duplicateActive.name}".` 
            };
        }

        // 3. Dapatkan kode sekolah
        const { data: profile } = await supabase
            .from('profiles')
            .select('school_code')
            .eq('id', student.user_id)
            .single();

        if (!profile || !profile.school_code) {
            return { success: false, message: 'Kode sekolah tidak ditemukan.' };
        }

        const restoredName = student.name.replace(' (Diarsipkan)', '');
        const restoredEmail = `${originalNis}@${profile.school_code.toLowerCase()}.supabase.user`;
        const defaultPin = '123456'; // Default PIN saat dipulihkan

        // 4. Update Auth User kembali ke email asli dan set default PIN
        const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(
            studentId,
            { 
                email: restoredEmail,
                password: defaultPin
            }
        );

        if (authUpdateErr) {
            return { success: false, message: `Gagal memulihkan autentikasi siswa: ${authUpdateErr.message}` };
        }

        // 5. Update data siswa ke NIS dan Nama asli
        const { error: studentUpdateErr } = await supabase
            .from('students')
            .update({
                nis: originalNis,
                name: restoredName
            })
            .eq('id', studentId);

        if (studentUpdateErr) {
            return { success: false, message: `Gagal mengembalikan profil siswa di database: ${studentUpdateErr.message}` };
        }

        revalidatePath('/profiles');
        return {
            success: true,
            message: `Siswa ${restoredName} berhasil diaktifkan kembali dengan PIN default: 123456.`
        };
    } catch (err: any) {
        return { success: false, message: `Gagal memulihkan siswa: ${err.message || err}` };
    }
}


interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  newStudents: Student[];
}

export async function importStudentsAction(csvContent: string): Promise<ImportResult> {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Anda harus masuk untuk melakukan impor.', importedCount: 0, newStudents: [] };
  }

  const { data: profile } = await supabase.from('profiles').select('school_code, plan, custom_quota').eq('id', user.id).single();
  if (!profile || !profile.school_code) {
    return { success: false, message: 'Kode sekolah Anda belum diatur.', importedCount: 0, newStudents: [] };
  }
  
  const { count: currentStudentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('nis', 'like', '%_arc_%');
  const studentQuota = profile.custom_quota || (profile.plan === 'PRO' ? 40 : 5);

  const lines = csvContent.trim().split('\n');
  const header = lines.shift()?.trim()?.split(',');

  if (!header || !['nis', 'name', 'class', 'pin'].every(h => header.includes(h))) {
    return { success: false, message: 'Header CSV tidak valid. Pastikan mengandung kolom: nis, name, class, pin.', importedCount: 0, newStudents: [] };
  }

  const nisIndex = header.indexOf('nis');
  const nameIndex = header.indexOf('name');
  const classIndex = header.indexOf('class');
  const whatsappIndex = header.indexOf('whatsapp_number');
  const pinIndex = header.indexOf('pin');

  const studentsToImport = lines.map(line => {
    const values = line.trim().split(',');
    return {
      nis: values[nisIndex]?.trim(),
      name: values[nameIndex]?.trim(),
      class: values[classIndex]?.trim(),
      whatsapp_number: whatsappIndex !== -1 ? values[whatsappIndex]?.trim() : null,
      pin: values[pinIndex]?.trim() || '123456',
    };
  }).filter(s => s.nis && s.name && s.class);

  if (studentsToImport.length === 0) {
    return { success: false, message: 'Tidak ada data siswa yang valid untuk diimpor dari file CSV.', importedCount: 0, newStudents: [] };
  }

  if ((currentStudentCount || 0) + studentsToImport.length > studentQuota) {
    return { success: false, message: `Gagal mengimpor. Kuota siswa Anda (${studentQuota}) akan terlampaui.`, importedCount: 0, newStudents: [] };
  }

  let importedCount = 0;
  const createdStudents: Student[] = [];
  const errors: string[] = [];

  for (const student of studentsToImport) {
    const shadowEmail = `${student.nis}@${profile.school_code.toLowerCase()}.supabase.user`;
    
    // Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: shadowEmail,
      password: student.pin,
      email_confirm: true,
    });

    if (authError) {
      errors.push(`NIS ${student.nis}: ${authError.message.includes('unique') ? 'sudah terdaftar' : authError.message}`);
      continue;
    }

    if (authData.user) {
      // Then, create the student profile
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          id: authData.user.id,
          nis: student.nis,
          name: student.name,
          class: student.class,
          user_id: user.id,
          whatsapp_number: student.whatsapp_number,
        })
        .select()
        .single();
      
      if (studentError) {
        errors.push(`NIS ${student.nis}: ${studentError.message}`);
        // Rollback auth user creation
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } else {
        createdStudents.push({ ...studentData, transactions: [] });
        importedCount++;
      }
    }
  }

  revalidatePath('/profiles');
  
  if (errors.length > 0) {
    return { 
      success: importedCount > 0, 
      message: `Berhasil mengimpor ${importedCount} siswa. Gagal: ${errors.length} siswa. Error: ${errors.join(', ')}`,
      importedCount,
      newStudents: createdStudents
    };
  }

  return { 
    success: true, 
    message: `Berhasil mengimpor ${importedCount} siswa baru.`,
    importedCount,
    newStudents: createdStudents
  };
}
