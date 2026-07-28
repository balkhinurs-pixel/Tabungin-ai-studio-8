
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function getStudentKioskData(nis: string, schoolCode: string) {
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        class,
        daily_limit,
        transactions (
          amount,
          type,
          created_at
        ),
        profiles:user_id!inner (
          school_code
        )
      `)
      .eq('nis', nis.trim())
      .eq('profiles.school_code', schoolCode.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Kiosk Action Database Error:', error);
      return { success: false, message: 'Gagal mengakses database.' };
    }

    if (!data) {
      return { success: false, message: 'Siswa tidak ditemukan di sekolah ini.' };
    }

    const balance = (data.transactions || []).reduce((acc: number, tx: any) => {
      return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
    }, 0);

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name,
        class: data.class,
        balance: balance,
        dailyLimit: data.daily_limit,
        nis: nis.trim(),
        schoolCode: schoolCode.trim().toLowerCase()
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
}) {
    const { studentId, nis, schoolCode, pin, amount } = params;
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

        // 2. Verifikasi Data Siswa & Limit Harian (Ambil data segar dari DB)
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select(`
                user_id,
                daily_limit,
                transactions (amount, type, created_at)
            `)
            .eq('id', studentId)
            .single();
        
        if (studentError || !student) {
            return { success: false, message: 'Gagal memverifikasi data siswa.' };
        }

        const currentBalance = (student.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        if (amount > currentBalance) {
            return { success: false, message: 'Saldo Anda tidak mencukupi.' };
        }

        // CEK LIMIT HARIAN (SECURITY CHECK)
        if (student.daily_limit && student.daily_limit > 0) {
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);

            // Hitung pengeluaran hari ini (Kantin + ATM)
            const todaySpent = (student.transactions || [])
                .filter((tx: any) => tx.type === 'Pengeluaran' && new Date(tx.created_at) >= todayStart)
                .reduce((sum: number, tx: any) => sum + tx.amount, 0);
            
            if (todaySpent + amount > student.daily_limit) {
                const remaining = student.daily_limit - todaySpent;
                return { 
                    success: false, 
                    message: `TRANSAKSI DITOLAK. Limit harian Anda terlampaui. Sisa jatah tarik/belanja hari ini: Rp ${remaining > 0 ? remaining.toLocaleString('id-ID') : '0'}` 
                };
            }
        }

        // 3. Catat Transaksi Penarikan
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
            student_id: studentId,
            user_id: student.user_id,
            amount: amount,
            type: 'Pengeluaran',
            category: 'TARIK_TUNAI',
            description: 'Tarik Tunai via Kios ATM'
        });

        if (txError) throw txError;

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
