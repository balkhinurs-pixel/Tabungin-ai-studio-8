
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * Mengambil daftar transaksi khusus untuk outlet yang sedang login dengan dukungan filter.
 */
export async function getCantineTransactionsAction(filters?: {
    dateFrom?: string;
    dateTo?: string;
    unsettledOnly?: boolean;
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    if (!user) return [];

    const supabaseAdmin = getSupabaseAdmin();
    
    let query = supabaseAdmin
        .from('transactions')
        .select(`
            *,
            students (
                name,
                class,
                nis
            )
        `)
        .eq('user_id', user.id)
        .eq('category', 'BELANJA_KANTIN');

    // Filter Status Pencairan
    if (filters?.unsettledOnly) {
        query = query.eq('is_settled', false);
    }

    // Filter Rentang Tanggal
    if (filters?.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00Z`);
    }
    if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59Z`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[GET_CANTINE_TX_ERROR]', error);
        return [];
    }

    return data || [];
}

/**
 * Mengambil data ringkas siswa untuk divalidasi di layar POS kasir sebelum minta PIN.
 */
export async function getStudentDataForPayment(nis: string, schoolCode: string) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { data, error } = await supabaseAdmin
            .from('students')
            .select(`
                id, name, class, nis, daily_limit,
                transactions (amount, type, created_at),
                profiles:user_id!inner (school_code)
            `)
            .eq('nis', nis.trim())
            .eq('profiles.school_code', schoolCode.trim().toLowerCase())
            .single();
        
        if (error || !data) return { success: false, message: 'Siswa tidak ditemukan di sekolah ini.' };

        const balance = (data.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                class: data.class,
                nis: data.nis,
                balance: balance,
                dailyLimit: data.daily_limit,
                schoolCode: schoolCode.trim().toLowerCase()
            }
        };
    } catch (err) {
        return { success: false, message: 'Terjadi kesalahan sistem saat mencari data siswa.' };
    }
}

/**
 * Memproses pembayaran dari tabungan siswa ke outlet kantin.
 */
export async function processCantinePayment(params: {
    studentId: string;
    nis: string;
    schoolCode: string;
    amount: number;
    pin: string;
}) {
    const { studentId, nis, schoolCode, amount, pin } = params;
    const supabaseAdmin = getSupabaseAdmin();
    const supabaseUser = createClient();
    
    try {
        // 1. Verifikasi PIN
        const authVerifier = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
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
            return { success: false, message: 'PIN Siswa Salah.' };
        }

        // 2. Identitas Merchant & Cek Limit (Ambil data paling segar)
        const { data: { user: activeMerchant } } = await supabaseUser.auth.getUser();
        if (!activeMerchant) return { success: false, message: 'Sesi outlet berakhir.' };

        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('daily_limit, transactions(amount, type, created_at)')
            .eq('id', studentId)
            .single();

        if (studentError || !student) return { success: false, message: 'Gagal verifikasi data siswa.' };

        const currentBalance = (student.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        if (amount > currentBalance) {
            return { success: false, message: 'Saldo Tabungan Tidak Cukup.' };
        }

        // CEK LIMIT HARIAN (SECURITY CHECK)
        if (student.daily_limit && student.daily_limit > 0) {
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            
            // Hitung total pengeluaran hari ini (Kantin + ATM)
            const todaySpent = (student.transactions || [])
                .filter((tx: any) => tx.type === 'Pengeluaran' && new Date(tx.created_at) >= todayStart)
                .reduce((sum: number, tx: any) => sum + tx.amount, 0);

            if (todaySpent + amount > student.daily_limit) {
                const remaining = student.daily_limit - todaySpent;
                return { 
                    success: false, 
                    message: `PEMBAYARAN DITOLAK. Limit harian siswa terlampaui. Sisa limit hari ini: Rp ${remaining > 0 ? remaining.toLocaleString('id-ID') : '0'}` 
                };
            }
        }

        const { data: merchantProfile } = await supabaseAdmin
            .from('profiles')
            .select('school_name')
            .eq('id', activeMerchant.id)
            .single();

        const merchantDisplayName = merchantProfile?.school_name || activeMerchant.email?.split('@')[0].toUpperCase() || 'KANTIN';

        // 3. Insert Transaksi
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
            student_id: studentId,
            user_id: activeMerchant.id,
            amount: amount,
            type: 'Pengeluaran',
            category: 'BELANJA_KANTIN',
            description: `Belanja: ${merchantDisplayName}`,
            is_settled: false
        });

        if (txError) throw txError;

        revalidatePath('/', 'layout'); 
        revalidatePath('/dashboard');
        revalidatePath('/home');
        revalidatePath(`/profiles/${studentId}`);

        return { success: true, message: 'Pembayaran Berhasil.' };
    } catch (err: any) {
        return { success: false, message: 'Gagal: ' + (err.message || 'Error internal') };
    }
}
