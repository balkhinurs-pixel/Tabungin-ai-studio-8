'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendFonnteMessage, sleep, DEFAULT_LOW_BALANCE_TEMPLATE } from '@/lib/fonnte';
import { revalidatePath } from 'next/cache';

/**
 * Mengambil Pengaturan Fonnte WA dari profil sekolah
 */
export async function getFonnteSettingsAction() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Tidak ada sesi login.' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, school_code, school_name, fonnte_token, low_balance_threshold, low_balance_template')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return { success: false, message: 'Gagal mengambil data profil.' };
  }

  return {
    success: true,
    fonnteToken: (profile as any).fonnte_token || '',
    lowBalanceThreshold: (profile as any).low_balance_threshold || 10000,
    lowBalanceTemplate: (profile as any).low_balance_template || DEFAULT_LOW_BALANCE_TEMPLATE,
    schoolCode: profile.school_code || '',
    schoolName: profile.school_name || ''
  };
}

/**
 * Menyimpan Pengaturan Fonnte WA
 */
export async function saveFonnteSettingsAction(params: {
  fonnteToken: string;
  lowBalanceThreshold: number;
  lowBalanceTemplate: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Sesi login telah berakhir.' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        fonnte_token: params.fonnteToken.trim(),
        low_balance_threshold: params.lowBalanceThreshold || 10000,
        low_balance_template: params.lowBalanceTemplate || DEFAULT_LOW_BALANCE_TEMPLATE
      })
      .eq('id', user.id);

    if (error) throw error;

    revalidatePath('/settings');
    return {
      success: true,
      message: 'Pengaturan Fonnte WhatsApp berhasil disimpan!'
    };
  } catch (err: any) {
    console.error('[SAVE_FONNTE_ERROR]', err);
    return {
      success: false,
      message: 'Gagal menyimpan pengaturan: ' + (err.message || 'Error internal')
    };
  }
}

/**
 * Kirim pesan uji coba (Test WA Fonnte)
 */
export async function sendTestFonnteWAAction(testPhone: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Sesi login telah berakhir.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_code, school_name, fonnte_token')
    .eq('id', user.id)
    .single();

  const token = (profile as any)?.fonnte_token;
  if (!token) {
    return { success: false, message: 'Token Fonnte belum diisi di Pengaturan.' };
  }

  const testMessage = `🔔 *TES NOTIFIKASI FONNTE WA*
  
Halo Admin/Guru Sekolah ${profile?.school_name || ''}!
Ini adalah pesan uji coba integrasi Fonnte WhatsApp Gateway.

Status: ✅ BERHASIL TERKONEKSI!
Sistem siap mengirimkan notifikasi saldo minimal ke orang tua siswa.`;

  const res = await sendFonnteMessage({
    target: testPhone,
    message: testMessage,
    token: token
  });

  return res;
}

/**
 * Batch Check & Send WhatsApp Notifikasi Saldo Minimal Ke Semua Wali Murid
 * Dengan jeda delay 2.5 - 3 detik per siswa untuk mencegah ban WhatsApp.
 */
export async function checkAndSendLowBalanceWAAction(baseUrl: string) {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Sesi login telah berakhir.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, school_code, school_name, fonnte_token, low_balance_threshold, low_balance_template')
    .eq('id', user.id)
    .single();

  const fonnteToken = (profile as any)?.fonnte_token;
  if (!fonnteToken) {
    return { success: false, message: 'Token Fonnte API belum dikonfigurasi.' };
  }

  const threshold = (profile as any)?.low_balance_threshold || 10000;
  const template = (profile as any)?.low_balance_template || DEFAULT_LOW_BALANCE_TEMPLATE;
  const schoolCode = profile?.school_code || 'sekolah';
  const loginUrl = `${baseUrl.replace(/\/$/, '')}/student-login`;

  // 1. Ambil semua siswa di sekolah
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id, name, nis, class, whatsapp_number')
    .eq('user_id', user.id);

  if (studentErr || !students || students.length === 0) {
    return {
      success: true,
      message: 'Tidak ada siswa terdaftar.',
      totalChecked: 0,
      totalLowBalance: 0,
      totalSent: 0,
      logs: []
    };
  }

  // 2. Hitung saldo masing-masing siswa
  const studentIds = students.map(s => s.id);
  const { data: txs } = await supabaseAdmin
    .from('transactions')
    .select('student_id, amount, type')
    .in('student_id', studentIds);

  const balanceMap: Record<string, number> = {};
  (txs || []).forEach(tx => {
    if (!balanceMap[tx.student_id]) balanceMap[tx.student_id] = 0;
    if (tx.type === 'Pemasukan') {
      balanceMap[tx.student_id] += tx.amount || 0;
    } else {
      balanceMap[tx.student_id] -= tx.amount || 0;
    }
  });

  // 3. Filter siswa dengan saldo <= threshold & punya nomor WA
  const lowBalanceStudents = students.filter(s => {
    const bal = balanceMap[s.id] || 0;
    const hasWA = s.whatsapp_number && s.whatsapp_number.trim().length >= 8;
    return bal <= threshold && hasWA;
  });

  if (lowBalanceStudents.length === 0) {
    return {
      success: true,
      message: `Semua siswa saat ini saldonya di atas batas minimal (Rp ${threshold.toLocaleString('id-ID')}). Tidak ada WA dikirim.`,
      totalChecked: students.length,
      totalLowBalance: 0,
      totalSent: 0,
      logs: []
    };
  }

  const logs: string[] = [];
  let successCount = 0;

  // 4. Pengiriman dengan DELAY (Anti-Ban WhatsApp)
  for (let i = 0; i < lowBalanceStudents.length; i++) {
    const s = lowBalanceStudents[i];
    const bal = balanceMap[s.id] || 0;

    // Ganti tag variabel template
    const formattedMessage = template
      .replace(/\{nama\}/g, s.name)
      .replace(/\{saldo\}/g, `Rp ${bal.toLocaleString('id-ID')}`)
      .replace(/\{nis\}/g, s.nis)
      .replace(/\{kode_sekolah\}/g, schoolCode)
      .replace(/\{url_login\}/g, loginUrl);

    // Kirim Fonnte WA
    const sendResult = await sendFonnteMessage({
      target: s.whatsapp_number!,
      message: formattedMessage,
      token: fonnteToken,
      delay: 2 // Fonnte internal queue delay
    });

    if (sendResult.success) {
      successCount++;
      logs.push(`✅ [${s.name}] WA terkirim ke ${s.whatsapp_number} (Saldo: Rp ${bal.toLocaleString('id-ID')})`);
    } else {
      logs.push(`❌ [${s.name}] Gagal: ${sendResult.message}`);
    }

    // Jeda antar iterasi (2.5 detik) agar aman dari anti-spam WA
    if (i < lowBalanceStudents.length - 1) {
      await sleep(2500);
    }
  }

  return {
    success: true,
    message: `Proses pengiriman selesai! Terkirim ${successCount} dari ${lowBalanceStudents.length} siswa bertarget.`,
    totalChecked: students.length,
    totalLowBalance: lowBalanceStudents.length,
    totalSent: successCount,
    logs
  };
}

/**
 * Otomatis periksa 1 siswa setelah transaksi jika saldonya turun di bawah threshold.
 */
export async function triggerSingleStudentLowBalanceWA(params: {
  studentId: string;
  teacherUserId: string;
  baseUrl: string;
}) {
  const { studentId, teacherUserId, baseUrl } = params;
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('school_code, fonnte_token, low_balance_threshold, low_balance_template')
      .eq('id', teacherUserId)
      .single();

    const fonnteToken = (profile as any)?.fonnte_token;
    if (!fonnteToken) return;

    const threshold = (profile as any)?.low_balance_threshold || 10000;
    const template = (profile as any)?.low_balance_template || DEFAULT_LOW_BALANCE_TEMPLATE;
    const schoolCode = profile?.school_code || 'sekolah';
    const loginUrl = `${baseUrl.replace(/\/$/, '')}/student-login`;

    // Ambil data siswa
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('name, nis, whatsapp_number')
      .eq('id', studentId)
      .single();

    if (!student || !student.whatsapp_number) return;

    // Hitung saldo terbaru
    const { data: txs } = await supabaseAdmin
      .from('transactions')
      .select('amount, type')
      .eq('student_id', studentId);

    let currentBalance = 0;
    (txs || []).forEach(tx => {
      if (tx.type === 'Pemasukan') currentBalance += tx.amount || 0;
      else currentBalance -= tx.amount || 0;
    });

    // Jika saldo <= threshold, kirim WA
    if (currentBalance <= threshold) {
      const formattedMessage = template
        .replace(/\{nama\}/g, student.name)
        .replace(/\{saldo\}/g, `Rp ${currentBalance.toLocaleString('id-ID')}`)
        .replace(/\{nis\}/g, student.nis)
        .replace(/\{kode_sekolah\}/g, schoolCode)
        .replace(/\{url_login\}/g, loginUrl);

      await sendFonnteMessage({
        target: student.whatsapp_number,
        message: formattedMessage,
        token: fonnteToken,
        delay: 2
      });
    }
  } catch (err) {
    console.error('[AUTO_LOW_BALANCE_WA_ERROR]', err);
  }
}
