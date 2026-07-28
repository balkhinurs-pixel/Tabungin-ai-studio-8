'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActionResult {
  success: boolean;
  message: string;
}

export async function getCantineOutletsAction() {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('school_code')
    .eq('id', user.id)
    .single();

  if (!teacherProfile?.school_code) return [];

  const { data: outlets, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, school_name')
    .eq('school_code', teacherProfile.school_code)
    .eq('role', 'CANTINE');

  if (error) {
    console.error('[GET_CANTINE_ERROR]', error);
    return [];
  }

  return outlets.map(p => ({
    id: p.id,
    displayId: p.school_name || p.email.split('@')[0].toUpperCase()
  })) || [];
}

export async function getMerchantSettlementStatsAction() {
    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: { user: teacher } } = await supabase.auth.getUser();
    if (!teacher) return [];

    const { data: teacherProfile } = await supabase.from('profiles').select('school_code').eq('id', teacher.id).single();
    if (!teacherProfile) return [];

    const { data: merchants } = await supabaseAdmin
        .from('profiles')
        .select('id, email, school_name')
        .eq('school_code', teacherProfile.school_code)
        .eq('role', 'CANTINE');

    if (!merchants || merchants.length === 0) return [];

    const stats = await Promise.all(merchants.map(async (m) => {
        const { data: txs } = await supabaseAdmin
            .from('transactions')
            .select('amount')
            .eq('user_id', m.id)
            .eq('category', 'BELANJA_KANTIN')
            .eq('is_settled', false);
        
        const totalUnsettled = (txs || []).reduce((acc, curr) => acc + curr.amount, 0);

        return {
            merchantId: m.id,
            merchantName: m.school_name || m.email.split('@')[0].toUpperCase(),
            unsettledAmount: totalUnsettled
        };
    }));

    return stats;
}

export async function getSettledHistoryAction() {
    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: { user: teacher } } = await supabase.auth.getUser();
    if (!teacher) return [];

    const { data: teacherProfile } = await supabase.from('profiles').select('school_code').eq('id', teacher.id).single();
    if (!teacherProfile) return [];

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select(`
            id, created_at, amount, description,
            profiles!inner (school_name, school_code),
            students (name, class)
        `)
        .eq('category', 'BELANJA_KANTIN')
        .eq('is_settled', true)
        .eq('profiles.school_code', teacherProfile.school_code)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[GET_SETTLED_HISTORY_ERROR]', error);
        return [];
    }

    return data.map((tx: any) => ({
        id: tx.id,
        date: tx.created_at,
        amount: tx.amount,
        merchantName: (tx.profiles as any)?.school_name || 'OUTLET',
        studentName: tx.students?.name || 'Siswa',
        studentClass: tx.students?.class || '-'
    }));
}

export async function updateAdminFeeConfigAction(amount: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const { error } = await supabase
        .from('profiles')
        .update({ admin_fee: amount })
        .eq('id', user.id);

    if (error) return { success: false, message: error.message };
    
    revalidatePath('/settlement');
    return { success: true, message: 'Konfigurasi biaya admin diperbarui.' };
}

export async function getAdminFeeStatsAction() {
    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('amount, description, created_at')
        .eq('category', 'BIAYA_ADMIN')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[GET_ADMIN_FEE_STATS_ERROR]', error);
        return [];
    }

    const stats: Record<string, { month: string, total: number, count: number }> = {};
    
    data.forEach(tx => {
        const monthMatch = tx.description.match(/Biaya Admin: (.*)/);
        const monthKey = monthMatch ? monthMatch[1] : format(new Date(tx.created_at), 'MMMM yyyy', { locale: id });
        
        if (!stats[monthKey]) {
            stats[monthKey] = { month: monthKey, total: 0, count: 0 };
        }
        stats[monthKey].total += tx.amount;
        stats[monthKey].count += 1;
    });

    return Object.values(stats);
}

export async function processBatchAdminFeeAction(monthName: string) {
    const supabase = createClient();
    const supabaseAdmin = getSupabaseAdmin();
    
    // VALIDASI USER SECURE DENGAN getUser()
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
        return { success: false, message: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' };
    }

    const { data: profile } = await supabase.from('profiles').select('admin_fee').eq('id', user.id).single();
    const fee = profile?.admin_fee || 0;

    if (fee <= 0) {
        return { success: false, message: 'Atur nominal biaya admin terlebih dahulu.' };
    }

    // AMBIL SISWA MENGGUNAKAN ADMIN CLIENT UNTUK BYPASS RLS TAPI TETAP FILTER ID GURU
    // Kita gunakan hak akses admin untuk memastikan seluruh daftar siswa terbaca
    const { data: students, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id, name')
        .eq('user_id', user.id);

    if (studentError) {
        return { success: false, message: 'Gagal mengambil data siswa: ' + studentError.message };
    }

    if (!students || students.length === 0) {
        return { success: false, message: 'Tidak ada data siswa ditemukan untuk akun Anda.' };
    }

    let successCount = 0;
    const errors = [];

    for (const student of students) {
        try {
            const description = `Biaya Admin: ${monthName}`;
            
            // Cek apakah siswa ini sudah ditarik di bulan yang sama
            const { data: existing } = await supabaseAdmin
                .from('transactions')
                .select('id')
                .eq('student_id', student.id)
                .eq('description', description)
                .maybeSingle();

            if (existing) continue;

            const { error: txError } = await supabaseAdmin.from('transactions').insert({
                student_id: student.id,
                user_id: user.id, // Referensi ke guru pengelola
                amount: fee,
                type: 'Pengeluaran',
                category: 'BIAYA_ADMIN',
                description: description,
                is_settled: true
            });

            if (!txError) successCount++;
        } catch (e) {
            errors.push(student.name);
        }
    }

    revalidatePath('/dashboard');
    revalidatePath('/profiles');
    revalidatePath('/settlement');
    revalidatePath('/today-transactions');
    
    return { 
        success: true, 
        message: `Berhasil memproses potongan untuk ${successCount} siswa bulan ${monthName}.` 
    };
}

export async function getUnsettledTransactionDetailsAction(merchantId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
        .from('transactions')
        .select(`
            id,
            created_at,
            amount,
            description,
            students (name, nis, class)
        `)
        .eq('user_id', merchantId)
        .eq('category', 'BELANJA_KANTIN')
        .eq('is_settled', false)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function settleMerchantTransactionsAction(merchantId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    
    try {
        const { error } = await supabaseAdmin
            .from('transactions')
            .update({ is_settled: true })
            .eq('user_id', merchantId)
            .eq('category', 'BELANJA_KANTIN')
            .eq('is_settled', false);

        if (error) throw error;

        revalidatePath('/settings');
        revalidatePath('/cantine/outlet');
        revalidatePath('/settlement');
        return { success: true, message: 'Settlement berhasil diproses.' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}

export async function addCantineAction(params: {
  cantineId: string;
  pin: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Sesi berakhir, silakan login kembali.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_code')
    .eq('id', user.id)
    .single();

  if (!profile?.school_code) {
    return { success: false, message: 'Mohon atur ulang Kode Sekolah Anda di tab Umum terlebih dahulu.' };
  }

  const sanitizedId = params.cantineId.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  
  if (!sanitizedId || sanitizedId.length < 3) {
      return { success: false, message: 'ID Kantin tidak valid (min. 3 karakter).' };
  }

  const schoolCode = profile.school_code.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const shadowEmail = `${sanitizedId}@${schoolCode}.kantin.user`;

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: shadowEmail,
      password: params.pin,
      email_confirm: true,
      user_metadata: { role: 'CANTINE', school_code: schoolCode }
    });

    if (authError) {
      if (authError.message.includes('unique') || authError.message.includes('already exists')) {
        return { success: false, message: `ID Kantin "${sanitizedId}" sudah terdaftar di sekolah ini.` };
      }
      return { success: false, message: `Gagal Auth: ${authError.message}` };
    }

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: shadowEmail,
          school_name: sanitizedId.toUpperCase(),
          school_code: schoolCode,
          role: 'CANTINE',
          plan: 'TRIAL'
        }, { onConflict: 'id' });

      if (profileError) {
        return { success: false, message: `Gagal Profile: ${profileError.message}` };
      }
    }

    revalidatePath('/settings');
    revalidatePath('/settlement');
    return { success: true, message: `Akun outlet "${sanitizedId}" berhasil dibuat.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Terjadi kesalahan sistem internal.' };
  }
}

export async function deleteCantineAction(cantineUserId: string): Promise<ActionResult> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(cantineUserId);
      if (error) throw error;
      
      revalidatePath('/settings');
      revalidatePath('/settlement');
      return { success: true, message: 'Akun outlet berhasil dihapus.' };
  } catch (err: any) {
      return { success: false, message: err.message };
  }
}

export async function exportUserData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_code')
    .eq('id', user.id)
    .single();

  const [
    { data: students },
    { data: transactions }
  ] = await Promise.all([
    supabase.from('students').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('*').eq('user_id', user.id)
  ]);

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    school_code: profile?.school_code || 'unknown',
    students: students || [],
    transactions: transactions || []
  };
}

export async function importUserData(backup: any) {
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Sesi berakhir.' };
  if (!backup.students || !backup.transactions) return { success: false, message: 'Format tidak valid.' };

  const { data: profile } = await supabase.from('profiles').select('school_code').eq('id', user.id).single();

  try {
    for (const student of backup.students) {
      const shadowEmail = `${student.nis}@${profile?.school_code}.supabase.user`;
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(student.id);
      
      if (!existingUser.user) {
        await supabaseAdmin.auth.admin.createUser({
          id: student.id,
          email: shadowEmail,
          password: '123456',
          email_confirm: true,
        });
      }

      await supabase.from('students').upsert({
        id: student.id,
        nis: student.nis,
        name: student.name,
        class: student.class,
        whatsapp_number: student.whatsapp_number,
        user_id: user.id,
        created_at: student.created_at
      });
    }

    const transactionsToInsert = backup.transactions.map((tx: any) => ({
      id: tx.id,
      student_id: tx.student_id,
      user_id: user.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      created_at: tx.created_at
    }));

    if (transactionsToInsert.length > 0) {
      await supabase.from('transactions').upsert(transactionsToInsert);
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Data berhasil dipulihkan.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
