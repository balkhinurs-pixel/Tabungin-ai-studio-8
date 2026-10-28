
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { triggerSingleStudentLowBalanceWA } from '../settings/fonnte-actions';

/**
 * Mengambil daftar transaksi khusus untuk outlet yang sedang login dengan dukungan filter.
 * Dilengkapi konversi cerdas zona waktu WIB (UTC+7) agar transaksi pagi/baru langsung terdeteksi.
 */
export async function getCantineTransactionsAction(filters?: {
    dateFrom?: string;
    dateTo?: string;
    unsettledOnly?: boolean;
    paymentMethod?: 'ALL' | 'CASH' | 'TABUNGAN';
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    if (!user) return [];

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Dapatkan profil akun yang sedang login untuk resolusi sekolah/outlet
    const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, school_code')
        .eq('id', user.id)
        .maybeSingle();

    let userIds = [user.id];

    // Jika akun memiliki kode sekolah, sertakan akun kantin / admin di sekolah yang sama
    // agar data penjualan kasir selalu terdeteksi bagi pihak pengelola
    if (userProfile?.school_code) {
        const { data: schoolProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('school_code', userProfile.school_code)
            .in('role', ['CANTINE', 'ADMIN', 'GURU', 'TEACHER']);

        if (schoolProfiles && schoolProfiles.length > 0) {
            userIds = Array.from(new Set([user.id, ...schoolProfiles.map(p => p.id)]));
        }
    }
    
    let query = supabaseAdmin
        .from('transactions')
        .select(`
            *,
            students (
                name,
                class,
                nis
            )
        `);

    if (userIds.length > 1) {
        query = query.in('user_id', userIds);
    } else {
        query = query.eq('user_id', user.id);
    }

    // Ambil seluruh transaksi kantin (baik via BELANJA_KANTIN maupun deskripsi penjualan tunai)
    query = query.or('category.eq.BELANJA_KANTIN,category.eq.KANTIN,description.ilike.Tunai%,description.ilike.Penjualan Tunai%');

    // Filter Status Pencairan
    if (filters?.unsettledOnly) {
        query = query.eq('is_settled', false);
    }

    // 2. Filter Rentang Tanggal yang Sadar Zona Waktu (WIB / UTC+7)
    // Format tanggal input adalah YYYY-MM-DD dari browser kasir.
    // Pukul 00:00:00 WIB = Pukul 17:00:00 UTC kemarin.
    // Pukul 23:59:59.999 WIB = Pukul 16:59:59.999 UTC hari ini.
    if (filters?.dateFrom) {
        let dateGteUtc = filters.dateFrom;
        if (!dateGteUtc.includes('T')) {
            const [y, m, d] = filters.dateFrom.split('-').map(Number);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                dateGteUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 3600 * 1000).toISOString();
            }
        }
        query = query.gte('created_at', dateGteUtc);
    }

    if (filters?.dateTo) {
        let dateLteUtc = filters.dateTo;
        if (!dateLteUtc.includes('T')) {
            const [y, m, d] = filters.dateTo.split('-').map(Number);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                dateLteUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 7 * 3600 * 1000).toISOString();
            }
        }
        query = query.lte('created_at', dateLteUtc);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[GET_CANTINE_TX_ERROR]', error);
        return [];
    }

    // 3. Ambil data katalog kantin untuk pencocokan harga modal (HPP) dan estimasi laba
    const { data: canteenItemsData } = await supabaseAdmin
        .from('canteen_items')
        .select('name, price, cost_price')
        .in('user_id', userIds);

    const catalogMap = new Map<string, { price: number; cost_price: number }>();
    (canteenItemsData || []).forEach((item: any) => {
        if (item.name) {
            catalogMap.set(item.name.trim().toLowerCase(), {
                price: Number(item.price || 0),
                cost_price: Number(item.cost_price || 0)
            });
        }
    });

    // 4. Enrich & Klasifikasi Jenis Pembayaran serta Kalkulasi Modal & Keuntungan
    let enriched = (data || []).map((tx: any) => {
        const isCashTransaction = !tx.student_id || 
            tx.students?.nis === 'CASH-UMUM' || 
            tx.students?.nis === 'UMUM' || 
            tx.students?.name?.toLowerCase().includes('pembeli umum') ||
            (tx.description && (tx.description.startsWith('Tunai') || tx.description.startsWith('Penjualan Tunai')));

        // Analisis item dari deskripsi transaksi
        let calculatedCost = 0;
        let hasItemBreakdown = false;

        if (tx.description && tx.description.includes(':')) {
            const rawItemsPart = tx.description.split(':')[1]?.trim();
            if (rawItemsPart) {
                const itemSegments = rawItemsPart.split(',');
                itemSegments.forEach((segment: string) => {
                    const cleanSegment = segment.trim();
                    const match = cleanSegment.match(/^(.*?)(?:\s*\(([0-9]+)x\))?$/);
                    if (match) {
                        const itemName = match[1]?.trim().toLowerCase();
                        const qty = match[2] ? parseInt(match[2], 10) : 1;
                        if (itemName && catalogMap.has(itemName)) {
                            const catalogItem = catalogMap.get(itemName)!;
                            calculatedCost += (catalogItem.cost_price * qty);
                            hasItemBreakdown = true;
                        }
                    }
                });
            }
        }

        const estimatedCost = hasItemBreakdown ? calculatedCost : 0;
        const estimatedProfit = Math.max(0, tx.amount - estimatedCost);
        const profitMargin = tx.amount > 0 ? Math.round((estimatedProfit / tx.amount) * 100) : 0;

        return {
            ...tx,
            is_cash: isCashTransaction,
            payment_method: isCashTransaction ? 'CASH' : 'TABUNGAN',
            estimated_cost: estimatedCost,
            estimated_profit: estimatedProfit,
            profit_margin: profitMargin,
            has_item_breakdown: hasItemBreakdown
        };
    });

    // Filter Metode Pembayaran
    if (filters?.paymentMethod === 'CASH') {
        enriched = enriched.filter(tx => tx.is_cash);
    } else if (filters?.paymentMethod === 'TABUNGAN') {
        enriched = enriched.filter(tx => !tx.is_cash);
    }

    return enriched;
}

/**
 * Mengambil informasi sekolah terkait dari akun kantin yang sedang login
 */
export async function getCanteenSchoolInfoAction() {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('school_code, school_name')
        .eq('id', user.id)
        .maybeSingle();

    return {
        success: true,
        schoolCode: profile?.school_code || '',
        schoolName: profile?.school_name || 'Kantin Sekolah',
    };
}

/**
 * Mengambil data ringkas siswa untuk divalidasi di layar POS kasir sebelum minta PIN.
 * Otomatis terikat pada kode sekolah dari akun kantin yang sedang login.
 */
export async function getStudentDataForPayment(nisInput: string, schoolCodeInput?: string) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    const supabaseAdmin = getSupabaseAdmin();

    try {
        let nis = nisInput.trim();
        let embeddedSchoolCode = '';

        // Jika input gabungan seperti "12345,sch001"
        if (nis.includes(',')) {
            const parts = nis.split(',');
            nis = parts[0].trim();
            embeddedSchoolCode = parts[1].trim().toLowerCase();
        }

        // 1. Identifikasi sekolah akun kantin yang sedang login
        let activeSchoolCode = schoolCodeInput?.trim().toLowerCase() || '';
        let activeSchoolName = '';

        if (user) {
            const { data: merchantProfile } = await supabaseAdmin
                .from('profiles')
                .select('school_code, school_name')
                .eq('id', user.id)
                .maybeSingle();

            if (merchantProfile?.school_code) {
                activeSchoolCode = merchantProfile.school_code.trim().toLowerCase();
                activeSchoolName = merchantProfile.school_name || activeSchoolCode.toUpperCase();
            }
        }

        // Cek jika barcode memiliki kode sekolah yang berbeda dengan sekolah kantin ini
        if (embeddedSchoolCode && activeSchoolCode && embeddedSchoolCode !== activeSchoolCode) {
            return {
                success: false,
                message: `Kartu siswa berasal dari sekolah lain (${embeddedSchoolCode.toUpperCase()}). Kantin ini hanya melayani santri dari ${activeSchoolName || activeSchoolCode.toUpperCase()}.`
            };
        }

        // 2. Query siswa dengan filter ketat kode sekolah
        let query = supabaseAdmin
            .from('students')
            .select(`
                id, name, class, nis, daily_limit,
                transactions (amount, type, created_at),
                profiles:user_id!inner (school_code, school_name)
            `)
            .eq('nis', nis);
        
        if (activeSchoolCode) {
            query = query.eq('profiles.school_code', activeSchoolCode);
        }

        const { data, error } = await query.limit(1).maybeSingle();
        
        if (error || !data) {
            // Cek apakah siswa terdaftar di sekolah lain untuk memberikan penjelasan yang jelas
            const { data: otherStudent } = await supabaseAdmin
                .from('students')
                .select('name, profiles:user_id!inner (school_name, school_code)')
                .eq('nis', nis)
                .limit(1)
                .maybeSingle();

            if (otherStudent) {
                const otherSchool = (otherStudent.profiles as any)?.school_name || (otherStudent.profiles as any)?.school_code?.toUpperCase() || 'Sekolah Lain';
                return {
                    success: false,
                    message: `Siswa "${otherStudent.name}" terdaftar di ${otherSchool}. Kantin ${activeSchoolName || 'ini'} hanya menerima santri dari sekolah Anda.`
                };
            }

            return { 
                success: false, 
                message: `Siswa dengan NIS "${nis}" tidak ditemukan di ${activeSchoolName || 'sekolah ini'}.` 
            };
        }

        const balance = (data.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        // Hitung pemakaian uang saku hari ini (Kantin + ATM Kios)
        const todaySpent = (data.transactions || [])
            .filter((tx: any) => tx.type === 'Pengeluaran' && 
                (tx.category === 'BELANJA_KANTIN' || tx.category === 'TARIK_TUNAI') && 
                new Date(tx.created_at) >= todayStart
            )
            .reduce((sum: number, tx: any) => sum + tx.amount, 0);

        const remainingDailyLimit = data.daily_limit && data.daily_limit > 0
            ? Math.max(0, data.daily_limit - todaySpent)
            : null;

        return {
            success: true,
            data: {
                id: data.id,
                name: data.name,
                class: data.class,
                nis: data.nis,
                balance: balance,
                dailyLimit: data.daily_limit,
                remainingDailyLimit: remainingDailyLimit,
                todaySpent: todaySpent,
                schoolCode: (data.profiles as any)?.school_code || activeSchoolCode
            }
        };
    } catch (err) {
        return { success: false, message: 'Terjadi kesalahan sistem saat mencari data siswa.' };
    }
}

// --- MANAGEMENT STOK & KATALOG MENU KANTIN ---

/**
 * Mengambil daftar menu/produk kantin milik outlet yang sedang login.
 * Menghitung otomatis profit per porsi dan margin laba.
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
        
        return (data || []).map((item: any) => {
            const price = Number(item.price || 0);
            const cost_price = Number(item.cost_price ?? 0);
            const profit = Math.max(0, price - cost_price);
            const profit_margin = price > 0 ? Math.round((profit / price) * 100) : 0;
            return {
                ...item,
                price,
                cost_price,
                profit,
                profit_margin
            };
        });
    } catch (err) {
        console.error('[GET_CANTEEN_ITEMS_CATCH]', err);
        return [];
    }
}

/**
 * Menambah produk menu baru di kantin (dengan Harga Jual & Harga Modal).
 * Dilengkapi self-healing fallback jika tabel belum memiliki kolom cost_price.
 */
export async function addCanteenItemAction(params: {
    name: string;
    category: string;
    price: number;
    cost_price?: number;
    stock: number;
    image_url?: string;
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const payload: any = {
            user_id: user.id,
            name: params.name.trim(),
            category: params.category || 'Makanan',
            price: Number(params.price || 0),
            cost_price: Math.max(0, Number(params.cost_price || 0)),
            stock: Number(params.stock || 0),
            image_url: params.image_url || null,
            is_available: params.stock > 0
        };

        let { error } = await supabaseAdmin
            .from('canteen_items')
            .insert(payload);

        // Self-Healing Fallback: Jika database Supabase belum menambahkan kolom cost_price
        if (error && (error.message?.includes('cost_price') || error.code === '42703')) {
            console.warn('[canteen_items] Kolom cost_price belum ada di DB Supabase, insert tanpa cost_price...');
            delete payload.cost_price;
            const retry = await supabaseAdmin.from('canteen_items').insert(payload);
            error = retry.error;
        }

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: 'Menu berhasil ditambahkan!' };
    } catch (err: any) {
        return { success: false, message: 'Gagal menambah menu: ' + (err.message || 'Error internal') };
    }
}

/**
 * Mengubah data / stok menu kantin (termasuk Harga Jual & Harga Modal).
 * Dilengkapi self-healing fallback jika kolom cost_price belum ada.
 */
export async function updateCanteenItemAction(id: string, params: {
    name?: string;
    category?: string;
    price?: number;
    cost_price?: number;
    stock?: number;
    is_available?: boolean;
}) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const payload: any = { ...params, updated_at: new Date().toISOString() };
        if (typeof params.cost_price === 'number') {
            payload.cost_price = Math.max(0, Number(params.cost_price));
        }
        if (typeof params.price === 'number') {
            payload.price = Number(params.price);
        }
        if (typeof params.stock === 'number') {
            payload.is_available = params.stock > 0;
        }

        let { error } = await supabaseAdmin
            .from('canteen_items')
            .update(payload)
            .eq('id', id)
            .eq('user_id', user.id);

        // Self-Healing Fallback: Jika database Supabase belum ada kolom cost_price
        if (error && (error.message?.includes('cost_price') || error.code === '42703')) {
            console.warn('[canteen_items] Kolom cost_price belum ada di DB Supabase, update tanpa cost_price...');
            delete payload.cost_price;
            const retry = await supabaseAdmin
                .from('canteen_items')
                .update(payload)
                .eq('id', id)
                .eq('user_id', user.id);
            error = retry.error;
        }

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: 'Menu berhasil diperbarui!' };
    } catch (err: any) {
        return { success: false, message: 'Gagal mengubah menu: ' + (err.message || 'Error internal') };
    }
}

/**
 * Tambah / Kurangi stok secara cepat dari kartu POS/Katalog.
 */
export async function quickAdjustStockAction(id: string, delta: number) {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { data: item } = await supabaseAdmin
            .from('canteen_items')
            .select('stock')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!item) return { success: false, message: 'Menu tidak ditemukan.' };

        const newStock = Math.max(0, item.stock + delta);
        const { error } = await supabaseAdmin
            .from('canteen_items')
            .update({
                stock: newStock,
                is_available: newStock > 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/payment');
        return { success: true, message: `Stok diperbarui: ${newStock}`, newStock };
    } catch (err: any) {
        return { success: false, message: 'Gagal mengubah stok: ' + (err.message || 'Error internal') };
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

        const { data: merchantProfile } = await supabaseAdmin
            .from('profiles')
            .select('school_code, school_name')
            .eq('id', activeMerchant.id)
            .single();

        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select(`
                user_id, 
                daily_limit, 
                transactions(amount, type, created_at),
                profiles:user_id!inner(school_code, school_name)
            `)
            .eq('id', studentId)
            .single();

        if (studentError || !student) return { success: false, message: 'Gagal verifikasi data siswa.' };

        // VALIDASI KETAT SEKOLAH: Cegah santri dari sekolah lain bertransaksi di kantin ini
        if (merchantProfile?.school_code && (student.profiles as any)?.school_code) {
            const merchantCode = merchantProfile.school_code.toLowerCase().trim();
            const studentCode = ((student.profiles as any).school_code as string).toLowerCase().trim();
            if (merchantCode !== studentCode) {
                const schoolName = merchantProfile.school_name || merchantCode.toUpperCase();
                return { 
                    success: false, 
                    message: `PEMBAYARAN DITOLAK. Siswa bukan santri dari ${schoolName}. Kantin ini hanya melayani santri terdaftar.` 
                };
            }
        }

        const currentBalance = (student.transactions || []).reduce((acc: number, tx: any) => {
            return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
        }, 0);

        if (amount > currentBalance) {
            return { success: false, message: 'Saldo Tabungan Tidak Cukup.' };
        }

        // CEK LIMIT HARIAN UANG SAKU (SECURITY CHECK)
        if (student.daily_limit && student.daily_limit > 0) {
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            
            // Hitung total pengeluaran uang saku hari ini (Kantin + ATM Kios)
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
                    message: `PEMBAYARAN DITOLAK. Limit uang saku harian siswa terlampaui (Batas: Rp ${student.daily_limit.toLocaleString('id-ID')}/hari). Sisa jatah uang saku hari ini: Rp ${remaining.toLocaleString('id-ID')}` 
                };
            }
        }

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

        // Auto trigger Fonnte Low Balance WA asynchronously
        if (student.user_id) {
            triggerSingleStudentLowBalanceWA({
                studentId,
                teacherUserId: student.user_id,
                baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tabungin.vercel.app'
            }).catch(e => console.error('[CANTINE_LOW_BALANCE_WA_ERR]', e));
        }

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
        revalidatePath('/cantine/history');
        revalidatePath('/cantine/payment');

        return { success: true, message: 'Pembayaran Berhasil.' };
    } catch (err: any) {
        return { success: false, message: 'Gagal: ' + (err.message || 'Error internal') };
    }
}

/**
 * Memproses pembayaran TUNAI (Cash) di kasir kantin.
 * Mengurangi stok barang kantin dan mencatat transaksi penjualan tunai.
 */
export async function processCashPaymentAction(params: {
    amount: number;
    cashGiven: number;
    items?: Array<{ id: string; name: string; qty: number; price: number }>;
    customerName?: string;
}) {
    const { amount, cashGiven, items, customerName } = params;
    const supabaseAdmin = getSupabaseAdmin();
    const supabaseUser = createClient();

    try {
        const { data: { user: activeMerchant } } = await supabaseUser.auth.getUser();
        if (!activeMerchant) return { success: false, message: 'Sesi outlet berakhir.' };

        if (cashGiven < amount) {
            return { success: false, message: 'Uang tunai yang diterima kurang dari total tagihan.' };
        }

        // Cek stok item jika ada
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

        const { data: merchantProfile } = await supabaseAdmin
            .from('profiles')
            .select('school_name')
            .eq('id', activeMerchant.id)
            .single();

        const merchantDisplayName = merchantProfile?.school_name || activeMerchant.email?.split('@')[0].toUpperCase() || 'KANTIN';

        let desc = `Penjualan Tunai: ${customerName || 'Pembeli Tunai'}`;
        if (items && items.length > 0) {
            const itemSummary = items.map(i => `${i.name} (${i.qty}x)`).join(', ');
            desc = `Tunai [${customerName || 'Pembeli'}]: ${itemSummary}`;
        }

        // Helper fallback internal: Jika database Supabase masih memberlakukan NOT NULL pada student_id
        async function getOrCreateGeneralBuyerStudentId(merchantUserId: string): Promise<string | null> {
            try {
                // 1. Cek apakah sudah ada akun penampung kas tunai
                const { data: existingStudent } = await supabaseAdmin
                    .from('students')
                    .select('id')
                    .or('nis.eq.CASH-UMUM,nis.eq.UMUM')
                    .limit(1)
                    .maybeSingle();

                if (existingStudent?.id) {
                    return existingStudent.id;
                }

                // 2. Cek apakah ada record dengan nama Pembeli Umum
                const { data: existingByName } = await supabaseAdmin
                    .from('students')
                    .select('id')
                    .ilike('name', '%Pembeli Umum%')
                    .limit(1)
                    .maybeSingle();

                if (existingByName?.id) {
                    return existingByName.id;
                }

                // 3. Buat shadow user khusus penampung kas tunai
                const dummyEmail = `cash_umum_${merchantUserId.slice(0, 8)}@kantin.system.supabase.user`;
                const { data: authData } = await supabaseAdmin.auth.admin.createUser({
                    email: dummyEmail,
                    password: 'SystemCashUser2026!',
                    email_confirm: true,
                    user_metadata: { role: 'STUDENT', name: 'Pembeli Umum (Kas Kantin)' }
                });

                const targetAuthId = authData?.user?.id;
                if (targetAuthId) {
                    const { data: newStudent } = await supabaseAdmin
                        .from('students')
                        .insert({
                            id: targetAuthId,
                            nis: 'CASH-UMUM',
                            name: 'Pembeli Umum (Kas Kantin)',
                            class: 'Umum',
                            user_id: merchantUserId
                        })
                        .select('id')
                        .single();

                    if (newStudent?.id) {
                        return newStudent.id;
                    }
                }
            } catch (fallbackErr) {
                console.warn('[GENERAL_BUYER_FALLBACK_WARN]', fallbackErr);
            }
            return null;
        }

        // 1. Coba simpan transaksi penjualan tunai dengan student_id: null (rekomendasi standar)
        const txPayload: any = {
            user_id: activeMerchant.id,
            amount: amount,
            type: 'Pengeluaran',
            category: 'BELANJA_KANTIN',
            description: desc,
            is_settled: true // Langsung lunas untuk tunai
        };

        let { error: txError } = await supabaseAdmin.from('transactions').insert(txPayload);

        // 2. Self-Healing Fallback: Jika skema database Supabase masih terkena not-null constraint pada student_id
        if (txError && (
            txError.code === '23502' || 
            txError.message?.toLowerCase().includes('violates not-null constraint') ||
            txError.message?.toLowerCase().includes('student_id')
        )) {
            console.log('[CASH_PAYMENT] student_id constraint detected, using general cash buyer fallback...');
            const fallbackStudentId = await getOrCreateGeneralBuyerStudentId(activeMerchant.id);
            if (fallbackStudentId) {
                const retryRes = await supabaseAdmin.from('transactions').insert({
                    ...txPayload,
                    student_id: fallbackStudentId
                });
                txError = retryRes.error;
            }
        }

        if (txError) {
            console.error('[PROCESS_CASH_PAYMENT_ERROR]', txError);
            return {
                success: false,
                message: 'Gagal memproses pembayaran tunai. Silakan coba kembali atau periksa koneksi.'
            };
        }

        // Potong stok item
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
        revalidatePath('/cantine/menu');
        revalidatePath('/cantine/history');

        const change = cashGiven - amount;
        return { 
            success: true, 
            message: 'Pembayaran Tunai Berhasil!',
            change: change 
        };
    } catch (err: any) {
        return { success: false, message: 'Gagal memproses transaksi tunai: ' + (err.message || 'Error internal') };
    }
}

/**
 * Mengambil statistik ringkasan omset penjualan harian & produk terlaris kantin.
 */
export async function getCanteenDailySummaryAction() {
    const supabaseUser = createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return { 
        todayRevenue: 0, 
        todayCashRevenue: 0, 
        todayTabunganRevenue: 0, 
        todayUnsettled: 0,
        todayCount: 0, 
        topItem: '-',
        lowStockCount: 0,
        outOfStockCount: 0
    };

    const supabaseAdmin = getSupabaseAdmin();
    try {
        const now = new Date();
        const wibNow = new Date(now.getTime() + 7 * 3600 * 1000);
        const wibYear = wibNow.getUTCFullYear();
        const wibMonth = wibNow.getUTCMonth();
        const wibDate = wibNow.getUTCDate();
        const todayStartWIBInUTC = new Date(Date.UTC(wibYear, wibMonth, wibDate, 0, 0, 0, 0) - 7 * 3600 * 1000).toISOString();

        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role, school_code')
            .eq('id', user.id)
            .maybeSingle();

        let userIds = [user.id];
        if (userProfile?.school_code) {
            const { data: schoolProfiles } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('school_code', userProfile.school_code)
                .in('role', ['CANTINE', 'ADMIN', 'GURU', 'TEACHER']);

            if (schoolProfiles && schoolProfiles.length > 0) {
                userIds = Array.from(new Set([user.id, ...schoolProfiles.map(p => p.id)]));
            }
        }

        let txQuery = supabaseAdmin
            .from('transactions')
            .select('amount, description, created_at, student_id, is_settled')
            .or('category.eq.BELANJA_KANTIN,category.eq.KANTIN,description.ilike.Tunai%,description.ilike.Penjualan Tunai%')
            .gte('created_at', todayStartWIBInUTC);

        if (userIds.length > 1) {
            txQuery = txQuery.in('user_id', userIds);
        } else {
            txQuery = txQuery.eq('user_id', user.id);
        }

        // Fetch transactions today & items in parallel (termasuk name, price, cost_price untuk analisis laba)
        const [txsRes, itemsRes] = await Promise.all([
            txQuery,
            supabaseAdmin
                .from('canteen_items')
                .select('id, name, price, cost_price, stock')
                .eq('user_id', user.id)
        ]);

        const txs = txsRes.data || [];
        const items = itemsRes.data || [];

        const lowStockCount = items.filter(i => i.stock > 0 && i.stock <= 5).length;
        const outOfStockCount = items.filter(i => i.stock === 0).length;

        const catalogMap = new Map<string, { price: number; cost_price: number }>();
        items.forEach((item: any) => {
            if (item.name) {
                catalogMap.set(item.name.trim().toLowerCase(), {
                    price: Number(item.price || 0),
                    cost_price: Number(item.cost_price || 0)
                });
            }
        });

        // Hitung estimasi nilai stok & modal gudang kantin
        const totalStockValue = items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.stock || 0)), 0);
        const totalStockCost = items.reduce((sum, i) => sum + (Number(i.cost_price || 0) * Number(i.stock || 0)), 0);
        const potentialStockProfit = Math.max(0, totalStockValue - totalStockCost);

        if (txs.length === 0) {
            return { 
                todayRevenue: 0, 
                todayCashRevenue: 0, 
                todayTabunganRevenue: 0, 
                todayUnsettled: 0,
                todayEstimatedCost: 0,
                todayEstimatedProfit: 0,
                todayProfitMargin: 0,
                todayCount: 0, 
                topItem: '-',
                lowStockCount,
                outOfStockCount,
                totalStockValue,
                totalStockCost,
                potentialStockProfit
            };
        }

        const todayRevenue = txs.reduce((sum, tx) => sum + tx.amount, 0);
        const todayCashRevenue = txs.filter(tx => !tx.student_id || (tx.description && (tx.description.startsWith('Tunai') || tx.description.startsWith('Penjualan Tunai')))).reduce((sum, tx) => sum + tx.amount, 0);
        const todayTabunganRevenue = txs.filter(tx => Boolean(tx.student_id) && !(tx.description && (tx.description.startsWith('Tunai') || tx.description.startsWith('Penjualan Tunai')))).reduce((sum, tx) => sum + tx.amount, 0);
        const todayUnsettled = txs.filter(tx => !tx.is_settled && Boolean(tx.student_id) && !(tx.description && (tx.description.startsWith('Tunai') || tx.description.startsWith('Penjualan Tunai')))).reduce((sum, tx) => sum + tx.amount, 0);
        const todayCount = txs.length;

        // Hitung modal & keuntungan harian berdasarkan penjualan item
        let todayEstimatedCost = 0;
        const itemFrequency: Record<string, number> = {};

        txs.forEach(tx => {
            if (tx.description?.includes(':')) {
                const parts = tx.description.split(':')[1]?.split(',');
                parts?.forEach(p => {
                    const clean = p.trim();
                    const match = clean.match(/^(.*?)(?:\s*\(([0-9]+)x\))?$/);
                    if (match) {
                        const cleanName = match[1]?.trim().toLowerCase();
                        const qty = match[2] ? parseInt(match[2], 10) : 1;
                        if (cleanName) {
                            itemFrequency[cleanName] = (itemFrequency[cleanName] || 0) + qty;
                            if (catalogMap.has(cleanName)) {
                                const itemInfo = catalogMap.get(cleanName)!;
                                todayEstimatedCost += (itemInfo.cost_price * qty);
                            }
                        }
                    }
                });
            }
        });

        const todayEstimatedProfit = Math.max(0, todayRevenue - todayEstimatedCost);
        const todayProfitMargin = todayRevenue > 0 ? Math.round((todayEstimatedProfit / todayRevenue) * 100) : 0;

        let topItem = '-';
        let maxCount = 0;
        Object.entries(itemFrequency).forEach(([item, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topItem = item;
            }
        });

        return { 
            todayRevenue, 
            todayCashRevenue, 
            todayTabunganRevenue, 
            todayUnsettled,
            todayEstimatedCost,
            todayEstimatedProfit,
            todayProfitMargin,
            todayCount, 
            topItem,
            lowStockCount,
            outOfStockCount,
            totalStockValue,
            totalStockCost,
            potentialStockProfit
        };
    } catch (err) {
        console.error('[GET_CANTEEN_DAILY_SUMMARY_ERR]', err);
        return { 
            todayRevenue: 0, 
            todayCashRevenue: 0, 
            todayTabunganRevenue: 0, 
            todayUnsettled: 0,
            todayEstimatedCost: 0,
            todayEstimatedProfit: 0,
            todayProfitMargin: 0,
            todayCount: 0, 
            topItem: '-',
            lowStockCount: 0,
            outOfStockCount: 0,
            totalStockValue: 0,
            totalStockCost: 0,
            potentialStockProfit: 0
        };
    }
}


