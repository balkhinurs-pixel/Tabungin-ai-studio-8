
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

// --- MANAGEMENT STOK & KATALOG MENU KANTIN ---

/**
 * Mengambil daftar menu/produk kantin milik outlet yang sedang login.
 */
export async function getCanteenItemsAction() {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return [];

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { data, error } = await supabaseAdmin
            .from('canteen_items')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('[GET_CANTEEN_ITEMS_ERR]', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('[GET_CANTEEN_ITEMS_CATCH]', err);
        return [];
    }
}

/**
 * Menambah produk menu baru di kantin.
 */
export async function addCanteenItemAction(params: {
    name: string;
    category: string;
    price: number;
    stock: number;
    image_url?: string;
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { error } = await supabaseAdmin
            .from('canteen_items')
            .insert({
                user_id: user.id,
                name: params.name.trim(),
                category: params.category || 'Makanan',
                price: params.price,
                stock: params.stock,
                image_url: params.image_url || null,
                is_available: params.stock > 0
            });

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: 'Menu berhasil ditambahkan!' };
    } catch (err: any) {
        return { success: false, message: 'Gagal menambah menu: ' + (err.message || 'Error internal') };
    }
}

/**
 * Mengubah data / stok menu kantin.
 */
export async function updateCanteenItemAction(id: string, params: {
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
    is_available?: boolean;
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const payload: any = { ...params, updated_at: new Date().toISOString() };
        if (typeof params.stock === 'number') {
            payload.is_available = params.stock > 0;
        }

        const { error } = await supabaseAdmin
            .from('canteen_items')
            .update(payload)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: 'Menu berhasil diperbarui!' };
    } catch (err: any) {
        return { success: false, message: 'Gagal mengubah menu: ' + (err.message || 'Error internal') };
    }
}

/**
 * Menghapus menu kantin.
 */
export async function deleteCanteenItemAction(id: string) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { error } = await supabaseAdmin
            .from('canteen_items')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: 'Menu berhasil dihapus!' };
    } catch (err: any) {
        return { success: false, message: 'Gagal menghapus menu: ' + (err.message || 'Error internal') };
    }
}

/**
 * Memproses pembayaran dari tabungan siswa ke outlet kantin (dengan opsional rincian item).
 */
export async function processCantinePayment(params: {
    studentId: string;
    nis: string;
    schoolCode: string;
    amount: number;
    pin: string;
    items?: Array<{ id: string; name: string; qty: number; price: number }>;
}) {
    const { studentId, nis, schoolCode, amount, pin, items } = params;
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

        // Cek stok item jika ada items yang dibeli
        if (items && items.length > 0) {
            for (const item of items) {
                const { data: dbItem } = await supabaseAdmin
                    .from('canteen_items')
                    .select('stock, name')
                    .eq('id', item.id)
                    .single();

                if (dbItem && dbItem.stock < item.qty) {
                    return { 
                        success: false, 
                        message: `Stok produk "${dbItem.name}" tidak mencukupi (Tersisa: ${dbItem.stock}).` 
                    };
                }
            }
        }

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

        // Susun rincian item deskripsi
        let desc = `Belanja: ${merchantDisplayName}`;
        if (items && items.length > 0) {
            const itemSummary = items.map(i => `${i.name} (${i.qty}x)`).join(', ');
            desc = `Belanja: ${itemSummary}`;
        }

        // 3. Insert Transaksi
        const { error: txError } = await supabaseAdmin.from('transactions').insert({
            student_id: studentId,
            user_id: activeMerchant.id,
            amount: amount,
            type: 'Pengeluaran',
            category: 'BELANJA_KANTIN',
            description: desc,
            is_settled: false
        });

        if (txError) throw txError;

        // 4. Potong Stok Item di DB jika ada
        if (items && items.length > 0) {
            for (const item of items) {
                const { data: currentItem } = await supabaseAdmin
                    .from('canteen_items')
                    .select('stock')
                    .eq('id', item.id)
                    .single();

                if (currentItem) {
                    const newStock = Math.max(0, currentItem.stock - item.qty);
                    await supabaseAdmin
                        .from('canteen_items')
                        .update({ 
                            stock: newStock, 
                            is_available: newStock > 0,
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', item.id);
                }
            }
        }

        revalidatePath('/', 'layout'); 
        revalidatePath('/dashboard');
        revalidatePath('/home');
        revalidatePath(`/profiles/${studentId}`);
        revalidatePath('/cantine/menu');

        return { success: true, message: 'Pembayaran Berhasil.' };
    } catch (err: any) {
        return { success: false, message: 'Gagal: ' + (err.message || 'Error internal') };
    }
}
