
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { triggerSingleStudentLowBalanceWA } from '../settings/fonnte-actions';

export async function verifySchoolCodeAction(schoolCode: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const code = schoolCode.trim().toLowerCase();
  if (!code) {
    return { success: false, message: 'Kode sekolah wajib diisi.' };
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('school_code, school_name')
    .eq('school_code', code)
    .limit(1)
    .maybeSingle();

  if (error || !profile) {
    return { 
      success: false, 
      message: `Kode sekolah "${code.toUpperCase()}" tidak ditemukan di sistem Tabungin.` 
    };
  }

  return {
    success: true,
    schoolCode: profile.school_code,
    schoolName: profile.school_name || profile.school_code.toUpperCase(),
  };
}

export async function getStudentKioskData(nis: string, schoolCode: string) {
  const supabaseAdmin = getSupabaseAdmin();
  
  if (nis.includes('_arc_')) {
    return { success: false, message: 'Akun siswa ini telah dinonaktifkan (diarsipkan).' };
  }

  const trimmedSchoolCode = schoolCode?.trim().toLowerCase();
  if (!trimmedSchoolCode) {
    return { 
      success: false, 
      message: 'Kios ATM wajib terikat dengan kode sekolah sebelum dapat digunakan.' 
    };
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        class,
        avatar_url,
        daily_limit,
        transactions (
          amount,
          type,
          created_at
        ),
        profiles:user_id!inner (
          school_code,
          school_name
        )
      `)
      .eq('nis', nis.trim())
      .eq('profiles.school_code', trimmedSchoolCode)
      .maybeSingle();

    if (error) {
      console.error('Kiosk Action Database Error:', error);
      return { success: false, message: 'Gagal mengakses database.' };
    }

    if (!data) {
      // Cek apakah NIS terdaftar di sekolah lain untuk memberi notifikasi edukatif
      const { data: otherStudent } = await supabaseAdmin
        .from('students')
        .select('name, profiles:user_id!inner (school_name, school_code)')
        .eq('nis', nis.trim())
        .limit(1)
        .maybeSingle();

      if (otherStudent) {
        const otherSchool = (otherStudent.profiles as any)?.school_name || (otherStudent.profiles as any)?.school_code?.toUpperCase() || 'Sekolah Lain';
        return {
          success: false,
          message: `Siswa "${otherStudent.name}" terdaftar di sekolah lain (${otherSchool}). Kios ATM ini hanya melayani santri/siswa dari sekolah Anda.`
        };
      }

      return { success: false, message: `Siswa dengan NIS "${nis.trim()}" tidak ditemukan di sekolah ini.` };
    }

    const balance = (data.transactions || []).reduce((acc: number, tx: any) => {
      return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
    }, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Hitung pemakaian uang saku hari ini (Kantin + ATM Kios)
    const todayPocketSpent = (data.transactions || [])
      .filter((tx: any) => tx.type === 'Pengeluaran' && 
        (tx.category === 'BELANJA_KANTIN' || tx.category === 'TARIK_TUNAI') && 
        new Date(tx.created_at) >= todayStart
      )
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const remainingDailyLimit = data.daily_limit && data.daily_limit > 0
      ? Math.max(0, data.daily_limit - todayPocketSpent)
      : null;

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        class: data.class,
        avatarUrl: data.avatar_url || null,
        balance: balance,
        dailyLimit: data.daily_limit,
        remainingDailyLimit: remainingDailyLimit,
        todaySpent: todayPocketSpent,
        nis: nis.trim(),
        schoolCode: (data.profiles as any)?.school_code || schoolCode.trim().toLowerCase()
      }
    };
  } catch (err) {
    console.error('Kiosk Action Unexpected Error:', err);
    return { success: false, message: 'Terjadi kesalahan sistem.' };
  }
}

export async function processKioskWithdrawal(params: {
    studentId: string;
    nis: string;
    schoolCode: string;
    pin: string;
    amount: number;
    description?: string;
}) {
    const { studentId, nis, schoolCode, pin, amount, description } = params;
    
    if (nis.includes('_arc_')) {
        return { success: false, message: 'Akun siswa ini telah dinonaktifkan (diarsipkan).' };
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    
    try {
        // 1. Verifikasi PIN menggunakan Non-Persisting Client
        const authVerifier = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        const shadowEmail = `${nis}@${schoolCode.toLowerCase()}.supabase.user`;
        const { error: authError } = await authVerifier.auth.signInWithPassword({
            email: shadowEmail,
            password: pin
        });

        if (authError) {
            return { success: false, message: 'PIN yang Anda masukkan salah.' };
        }

        // 2. Verifikasi Data Siswa & Limit Harian (Ambil data segar dari DB terikat kode sekolah)
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select(`
                user_id,
                daily_limit,
                transactions (amount, type, created_at),
                profiles:user_id!inner (school_code)
            `)
            .eq('id', studentId)
            .eq('profiles.school_code', schoolCode.trim().toLowerCase())
            .single();
        
        if (studentError || !student) {
            return { success: false, message: 'Verifikasi sekolah gagal. Siswa tidak terdaftar di sekolah ini.' };
        }

        const currentBalance = (student.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        if (amount > currentBalance) {
            return { success: false, message: 'Saldo Anda tidak mencukupi.' };
        }

        // CEK LIMIT HARIAN UANG SAKU (SECURITY CHECK)
        if (student.daily_limit && student.daily_limit > 0) {
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);

            // Hitung pengeluaran uang saku hari ini (Kantin + ATM Kios)
            const todaySpent = (student.transactions || [])
                .filter((tx: any) => tx.type === 'Pengeluaran' && 
                    (tx.category === 'BELANJA_KANTIN' || tx.category === 'TARIK_TUNAI') && 
                    new Date(tx.created_at) >= todayStart
                )
                .reduce((sum: number, tx: any) => sum + tx.amount, 0);
            
            if (todaySpent + amount > student.daily_limit) {
                const remaining = Math.max(0, student.daily_limit - todaySpent);
                return { 
                    success: false, 
                    message: `PENARIKAN DITOLAK. Limit uang saku harian Anda terlampaui (Batas: Rp ${student.daily_limit.toLocaleString('id-ID')}/hari). Sisa jatah tarik tunai hari ini: Rp ${remaining.toLocaleString('id-ID')}` 
                };
            }
        }

        const formattedDescription = description && description.trim() !== '' 
            ? `Tarik Tunai - ${description.trim()}`
            : 'Tarik Tunai via Kios ATM';

        // 3. Catat Transaksi Penarikan
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
            student_id: studentId,
            user_id: student.user_id,
            amount: amount,
            type: 'Pengeluaran',
            category: 'TARIK_TUNAI',
            description: formattedDescription
        });

        if (txError) throw txError;

        // Auto trigger low balance WA notification asynchronously
        if (student.user_id) {
            triggerSingleStudentLowBalanceWA({
                studentId,
                teacherUserId: student.user_id,
                baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tabungin.vercel.app'
            }).catch(e => console.error('[KIOSK_LOW_BALANCE_WA_ERR]', e));
        }

        revalidatePath('/dashboard');
        revalidatePath(`/profiles/${studentId}`);
        revalidatePath('/home');

        return { 
            success: true, 
            message: 'Penarikan berhasil!',
            newBalance: currentBalance - amount
        };

    } catch (err) {
        console.error('Kiosk Withdrawal Error:', err);
        return { success: false, message: 'Terjadi kesalahan internal.' };
    }
}

/**
 * Mengambil ringkasan rekap penarikan tunai kios hari ini
 */
export async function getKioskDailySummaryAction() {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: txs, error } = await supabaseAdmin
            .from('transactions')
            .select(`
                id,
                amount,
                type,
                category,
                description,
                created_at,
                student_id,
                students (
                    name,
                    nis,
                    class
                )
            `)
            .eq('category', 'TARIK_TUNAI')
            .gte('created_at', todayStart.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching kiosk daily txs:', error);
            return { success: false, totalAmount: 0, totalCount: 0, transactions: [] };
        }

        const totalAmount = (txs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const totalCount = txs ? txs.length : 0;

        const formattedTxs = (txs || []).map((tx: any) => {
            const studentData = Array.isArray(tx.students) ? tx.students[0] : tx.students;
            return {
                id: tx.id,
                amount: tx.amount,
                description: tx.description || 'Tarik Tunai',
                createdAt: tx.created_at,
                studentName: studentData?.name || 'Siswa',
                studentNis: studentData?.nis || '-',
                studentClass: studentData?.class || '-'
            };
        });

        return {
            success: true,
            totalAmount,
            totalCount,
            transactions: formattedTxs
        };
    } catch (err: any) {
        console.error('Get Kiosk Daily Summary Error:', err);
        return { success: false, totalAmount: 0, totalCount: 0, transactions: [] };
    }
}

/**
 * Menyimpan log rekapitulasi kas harian penjaga kios
 */
export async function saveKioskSettlementAction(params: {
    initialCash: number;
    totalWithdrawal: number;
    expectedCash: number;
    actualPhysicalCash: number;
    variance: number;
    guardName?: string;
    notes?: string;
    denominations?: Record<string, number>;
}) {
    const supabaseAdmin = getSupabaseAdmin();
    const { initialCash, totalWithdrawal, expectedCash, actualPhysicalCash, variance, guardName, notes, denominations } = params;

    try {
        const desc = `Rekap Kas Kios [${guardName || 'Penjaga'}]: Modal Awal Rp ${initialCash.toLocaleString('id-ID')}, Keluar Rp ${totalWithdrawal.toLocaleString('id-ID')}, Fisik Rp ${actualPhysicalCash.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}`;

        // Simpan log transaksi rekap
        await supabaseAdmin.from('transactions').insert({
            amount: actualPhysicalCash,
            type: 'Pengeluaran',
            category: 'REKAP_KAS_KIOS',
            description: desc,
            is_settled: true
        });

        revalidatePath('/kiosk');
        revalidatePath('/dashboard');

        return {
            success: true,
            message: 'Rekap kas harian berhasil disimpan!'
        };
    } catch (err: any) {
        console.error('Save Kiosk Settlement Error:', err);
        return { success: false, message: 'Gagal menyimpan rekap: ' + (err.message || 'Error internal') };
    }
}

