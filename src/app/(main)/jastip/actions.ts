'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { JastipItem, JastipOrder } from '@/types';

// ==========================================
// ADMIN / TEACHER ACTIONS
// ==========================================

export async function getAdminJastipItemsAction(): Promise<JastipItem[]> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabaseAdmin
      .from('jastip_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_ADMIN_JASTIP_ITEMS_ERROR]', error);
      return [];
    }

    return (data as JastipItem[]) || [];
  } catch (err) {
    console.error('getAdminJastipItemsAction err', err);
    return [];
  }
}

export async function uploadJastipImageAction(formData: FormData): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi berakhir, silakan login kembali.' };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, message: 'Tidak ada file foto yang dipilih.' };
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: 'Ukuran foto maksimal 5MB.' };
    }

    // Validate mime type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimeTypes.includes(file.type)) {
      return { success: false, message: 'Format file tidak didukung. Harap gunakan file JPG, PNG, WEBP, atau GIF.' };
    }

    const bucketName = 'jastip-items';

    // Ensure bucket exists in Supabase Storage
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucketName);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: validMimeTypes
        });
      }
    } catch (bucketErr) {
      console.warn('[STORAGE_BUCKET_CHECK_WARN]', bucketErr);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(cleanFileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('[UPLOAD_JASTIP_IMAGE_ERROR]', uploadError);
      return { success: false, message: uploadError.message || 'Gagal mengunggah foto ke Supabase Storage.' };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      message: 'Foto berhasil diunggah ke Supabase Storage.'
    };
  } catch (err: any) {
    console.error('[UPLOAD_JASTIP_IMAGE_ACTION_ERROR]', err);
    return { success: false, message: err.message || 'Terjadi kesalahan saat mengunggah foto.' };
  }
}

export async function saveJastipItemAction(itemData: Partial<JastipItem>): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Sesi berakhir, silakan login kembali.' };
    }

    if (itemData.id) {
      // Update existing item
      const updatePayload: Record<string, any> = {
        name: itemData.name,
        category: itemData.category || 'Kebutuhan Santri',
        price: itemData.price,
        description: itemData.description || null,
        whatsapp_number: itemData.whatsapp_number ? itemData.whatsapp_number.replace(/\D/g, '') : null,
        is_available: itemData.is_available ?? true,
      };

      if (itemData.image_url !== undefined) {
        updatePayload.image_url = itemData.image_url || null;
      }

      const { error } = await supabaseAdmin
        .from('jastip_items')
        .update(updatePayload)
        .eq('id', itemData.id)
        .eq('user_id', user.id);

      if (error) throw error;

      revalidatePath('/jastip');
      revalidatePath('/home/jastip');
      return { success: true, message: 'Menu jastip berhasil diperbarui di database.' };
    } else {
      // Create new item
      const newItem = {
        user_id: user.id,
        name: itemData.name,
        category: itemData.category || 'Kebutuhan Santri',
        price: itemData.price || 0,
        description: itemData.description || null,
        whatsapp_number: itemData.whatsapp_number ? itemData.whatsapp_number.replace(/\D/g, '') : null,
        is_available: itemData.is_available ?? true,
        image_url: itemData.image_url || null,
      };

      const { error } = await supabaseAdmin
        .from('jastip_items')
        .insert([newItem]);

      if (error) throw error;

      revalidatePath('/jastip');
      revalidatePath('/home/jastip');
      return { success: true, message: 'Menu jastip baru berhasil ditambahkan.' };
    }
  } catch (err: any) {
    console.error('[SAVE_JASTIP_ITEM_ERROR]', err);
    return { success: false, message: err.message || 'Gagal menyimpan item jastip.' };
  }
}

export async function deleteJastipItemAction(itemId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const { error } = await supabaseAdmin
      .from('jastip_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/jastip');
    revalidatePath('/home/jastip');
    return { success: true, message: 'Menu jastip berhasil dihapus.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menghapus menu jastip.' };
  }
}

export async function toggleJastipAvailabilityAction(itemId: string, isAvailable: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Sesi berakhir.' };

    const { error } = await supabaseAdmin
      .from('jastip_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/jastip');
    revalidatePath('/home/jastip');
    return { success: true, message: 'Status ketersediaan berhasil diubah.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengubah status ketersediaan.' };
  }
}

export async function getDefaultJastipConfigAction(): Promise<{ default_jastip_whatsapp: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { default_jastip_whatsapp: '' };

    // 1. Check user_metadata from user session
    let waNumber = (user.user_metadata?.default_jastip_whatsapp as string) || '';

    // 2. If not found in session, check via supabaseAdmin auth
    if (!waNumber) {
      const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(user.id);
      waNumber = (adminUserData?.user?.user_metadata?.default_jastip_whatsapp as string) || '';
    }

    // 3. Fallback: try reading from profiles table if column exists
    if (!waNumber) {
      try {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (data && (data as any).default_jastip_whatsapp) {
          waNumber = (data as any).default_jastip_whatsapp;
        }
      } catch (err) {
        // Table column might not exist, silently ignore
      }
    }

    return { default_jastip_whatsapp: waNumber };
  } catch (err) {
    console.error('[GET_DEFAULT_JASTIP_CONFIG_ERROR]', err);
    return { default_jastip_whatsapp: '' };
  }
}

export async function updateDefaultJastipWhatsAppAction(whatsappNumber: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Sesi login telah berakhir.' };

    const cleanPhone = whatsappNumber.replace(/\D/g, '');

    // 1. Store in user_metadata (Auth) - always works without schema restrictions
    const currentMeta = user.user_metadata || {};
    
    // Update user auth metadata
    await supabase.auth.updateUser({
      data: {
        ...currentMeta,
        default_jastip_whatsapp: cleanPhone
      }
    });

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMeta,
        default_jastip_whatsapp: cleanPhone
      }
    });

    // 2. Also try updating profiles if column exists (wrapped in try-catch so it won't crash if column is missing)
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ default_jastip_whatsapp: cleanPhone } as any)
        .eq('id', user.id);
    } catch (profileErr) {
      // Ignored if column does not exist in profiles schema
      console.log('[PROFILES_SCHEMA_NOTICE] Stored in auth user_metadata instead.');
    }

    revalidatePath('/jastip');
    revalidatePath('/home/jastip');
    return { success: true, message: 'Nomor WhatsApp PIC Jastip berhasil disimpan.' };
  } catch (err: any) {
    console.error('[UPDATE_WA_ERROR]', err);
    return { success: false, message: err.message || 'Gagal menyimpan nomor WhatsApp.' };
  }
}

export async function getAdminJastipOrdersAction(): Promise<JastipOrder[]> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabaseAdmin
      .from('jastip_orders')
      .select(`
        id,
        created_at,
        student_id,
        user_id,
        items,
        total_amount,
        status,
        payment_method,
        notes,
        students (id, name, class, nis, whatsapp_number)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_ADMIN_JASTIP_ORDERS_ERROR]', error);
      return [];
    }

    return (data as unknown as JastipOrder[]) || [];
  } catch (err) {
    console.error('getAdminJastipOrdersAction err', err);
    return [];
  }
}

export async function updateJastipOrderStatusAction(
  orderId: string, 
  status: 'PENDING' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN'
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: 'Sesi berakhir.' };

    // Fetch current order details
    const { data: currentOrder, error: fetchErr } = await supabaseAdmin
      .from('jastip_orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr || !currentOrder) {
      return { success: false, message: 'Pesanan tidak ditemukan.' };
    }

    // Auto refund if status is changed to DIBATALKAN and payment was SALDO
    if (status === 'DIBATALKAN' && currentOrder.status !== 'DIBATALKAN' && currentOrder.payment_method === 'SALDO') {
      await supabaseAdmin.from('transactions').insert([{
        student_id: currentOrder.student_id,
        user_id: user.id,
        type: 'Pemasukan',
        category: 'TABUNGAN',
        amount: currentOrder.total_amount,
        description: `Refund Jastip Dibatalkan #${orderId.slice(0, 8).toUpperCase()}`,
        is_settled: true
      }]);
    }

    const { error } = await supabaseAdmin
      .from('jastip_orders')
      .update({ status })
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/jastip');
    revalidatePath('/home/jastip');
    revalidatePath('/home');
    revalidatePath('/dashboard');
    revalidatePath('/today-transactions');

    return { success: true, message: `Status pesanan #${orderId.slice(0, 8).toUpperCase()} diubah ke ${status}.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengubah status pesanan.' };
  }
}

// ==========================================
// STUDENT / WALISANTRI ACTIONS
// ==========================================

export async function getStudentJastipCatalogAction(): Promise<{
  items: JastipItem[];
  student: {
    id: string;
    name: string;
    class: string;
    nis: string;
    balance: number;
    daily_limit: number | null;
    today_spending: number;
  } | null;
}> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    let studentRecord: any = null;

    if (user) {
      const { data: std } = await supabaseAdmin
        .from('students')
        .select('id, nis, name, class, daily_limit, user_id, transactions(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (std) {
        studentRecord = std;
      }
    }

    // Fallback: check student cookie if session exists
    if (!studentRecord) {
      const cookieStore = await cookies();
      const studentCookie = cookieStore.get('student_session')?.value;
      if (studentCookie) {
        try {
          const parsed = JSON.parse(studentCookie);
          if (parsed.id) {
            const { data: std } = await supabaseAdmin
              .from('students')
              .select('id, nis, name, class, daily_limit, user_id, transactions(*)')
              .eq('id', parsed.id)
              .maybeSingle();
            if (std) studentRecord = std;
          }
        } catch {}
      }
    }

    let studentData = null;
    let teacherUserId = null;

    if (studentRecord) {
      teacherUserId = studentRecord.user_id;
      const txs = studentRecord.transactions || [];
      const pemasukan = txs.filter((t: any) => t.type === 'Pemasukan').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const pengeluaran = txs.filter((t: any) => t.type === 'Pengeluaran').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const balance = pemasukan - pengeluaran;

      const todayStr = new Date().toISOString().split('T')[0];
      const todaySpending = txs
        .filter((t: any) => t.type === 'Pengeluaran' && t.created_at?.startsWith(todayStr))
        .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

      studentData = {
        id: studentRecord.id,
        name: studentRecord.name,
        class: studentRecord.class,
        nis: studentRecord.nis,
        balance,
        daily_limit: studentRecord.daily_limit,
        today_spending: todaySpending
      };
    }

    // Query real jastip items from database
    let query = supabaseAdmin
      .from('jastip_items')
      .select('*')
      .eq('is_available', true);

    if (teacherUserId) {
      query = query.eq('user_id', teacherUserId);
    }

    const { data: dbItems, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_STUDENT_JASTIP_CATALOG_ERROR]', error);
      return {
        items: [],
        student: studentData
      };
    }

    return {
      items: (dbItems as JastipItem[]) || [],
      student: studentData
    };
  } catch (err) {
    console.error('getStudentJastipCatalogAction err', err);
    return {
      items: [],
      student: null
    };
  }
}

export async function createStudentJastipOrderAction(payload: {
  items: { id: string; name: string; price: number; quantity: number; image_url?: string | null }[];
  notes?: string;
  paymentMethod: 'SALDO' | 'WHATSAPP';
}): Promise<{
  success: boolean;
  message: string;
  data?: {
    orderId: string;
    waLink: string;
    totalAmount: number;
  };
}> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    let studentRecord: any = null;

    if (user) {
      const { data: std } = await supabaseAdmin
        .from('students')
        .select('*, transactions(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (std) studentRecord = std;
    }

    if (!studentRecord) {
      const cookieStore = await cookies();
      const studentCookie = cookieStore.get('student_session')?.value;
      if (studentCookie) {
        try {
          const parsed = JSON.parse(studentCookie);
          if (parsed.id) {
            const { data: std } = await supabaseAdmin
              .from('students')
              .select('*, transactions(*)')
              .eq('id', parsed.id)
              .maybeSingle();
            if (std) studentRecord = std;
          }
        } catch {}
      }
    }

    if (!studentRecord) {
      return { success: false, message: 'Sesi santri tidak ditemukan. Silakan login kembali.' };
    }

    const orderItems = payload.items.map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      subtotal: it.price * it.quantity,
      image_url: it.image_url || null
    }));

    const totalAmount = orderItems.reduce((sum, it) => sum + it.subtotal, 0);

    if (totalAmount <= 0) {
      return { success: false, message: 'Total belanja harus lebih dari Rp 0.' };
    }

    // Get Teacher Profile and metadata for default WhatsApp
    let teacherWhatsApp = '';
    if (studentRecord.user_id) {
      try {
        const { data: teacherAuth } = await supabaseAdmin.auth.admin.getUserById(studentRecord.user_id);
        if (teacherAuth?.user?.user_metadata?.default_jastip_whatsapp) {
          teacherWhatsApp = teacherAuth.user.user_metadata.default_jastip_whatsapp;
        }
      } catch (err) {
        console.error('[GET_TEACHER_AUTH_ERR]', err);
      }
    }

    // If Payment method is SALDO, check & deduct
    if (payload.paymentMethod === 'SALDO') {
      const txs = studentRecord.transactions || [];
      const pemasukan = txs.filter((t: any) => t.type === 'Pemasukan').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const pengeluaran = txs.filter((t: any) => t.type === 'Pengeluaran').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const currentBalance = pemasukan - pengeluaran;

      if (currentBalance < totalAmount) {
        return {
          success: false,
          message: `Saldo tabungan tidak mencukupi (Saldo: Rp ${currentBalance.toLocaleString('id-ID')}, Tagihan: Rp ${totalAmount.toLocaleString('id-ID')}). Anda bisa memilih metode Bayar via WA.`
        };
      }

      // Jastip menggunakan Dana Bebas Tabungan (tidak dibatasi oleh kuota limit uang saku harian kantin/kios)
      // Insert Transaction Record (Gunakan kategori TABUNGAN agar tidak mengurangi jatah uang saku harian kantin/kios)
      const summaryStr = orderItems.map(i => `${i.name} (${i.quantity}x)`).join(', ');
      const { error: txError } = await supabaseAdmin.from('transactions').insert([
        {
          student_id: studentRecord.id,
          user_id: studentRecord.user_id,
          type: 'Pengeluaran',
          category: 'TABUNGAN',
          amount: totalAmount,
          description: `Belanja Jastip: ${summaryStr}`,
          is_settled: true
        }
      ]);

      if (txError) {
        console.error('[INSERT_JASTIP_TRANSACTION_ERROR]', txError);
        return { success: false, message: 'Gagal memproses pemotongan saldo: ' + txError.message };
      }
    }

    // Insert order record into jastip_orders
    const orderRecord = {
      student_id: studentRecord.id,
      user_id: studentRecord.user_id,
      items: orderItems,
      total_amount: totalAmount,
      notes: payload.notes || null,
      status: 'PENDING',
      payment_method: payload.paymentMethod
    };

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from('jastip_orders')
      .insert([orderRecord])
      .select('id')
      .single();

    if (orderErr) {
      console.error('[INSERT_JASTIP_ORDER_ERROR]', orderErr);
      return { success: false, message: 'Gagal mencatat pesanan: ' + orderErr.message };
    }

    const createdId = insertedOrder.id;

    // Determine target WhatsApp number:
    // 1. Check if first item has custom whatsapp
    let targetWA = '';
    const firstItemId = payload.items[0]?.id;
    if (firstItemId) {
      const { data: itemData } = await supabaseAdmin
        .from('jastip_items')
        .select('whatsapp_number')
        .eq('id', firstItemId)
        .maybeSingle();
      if (itemData?.whatsapp_number) {
        targetWA = itemData.whatsapp_number.replace(/\D/g, '');
      }
    }

    if (!targetWA && teacherWhatsApp) {
      targetWA = teacherWhatsApp.replace(/\D/g, '');
    }

    if (!targetWA) {
      targetWA = '628123456789';
    }

    // Clean phone number (e.g. 0812 -> 62812)
    if (targetWA.startsWith('0')) {
      targetWA = '62' + targetWA.slice(1);
    }

    // Generate WhatsApp Text
    const itemsListText = orderItems.map((it, idx) => `${idx + 1}. ${it.name} x${it.quantity} = Rp ${it.subtotal.toLocaleString('id-ID')}`).join('%0A');
    const paymentText = payload.paymentMethod === 'SALDO' ? 'POTONG SALDO TABUNGAN (LUNAS)' : 'BAYAR MANDIRI / TUNAI';
    const notesText = payload.notes ? `%0A*Catatan/Kamar:* ${encodeURIComponent(payload.notes)}` : '';

    const waMessage = `*PESANAN JASTIP SANTRI*%0A%0A` +
      `*No. Pesanan:* %23${createdId.slice(0, 8).toUpperCase()}%0A` +
      `*Nama Santri:* ${encodeURIComponent(studentRecord.name)} (${encodeURIComponent(studentRecord.class)})%0A` +
      `*NIS:* ${encodeURIComponent(studentRecord.nis.includes('_arc_') ? studentRecord.nis.split('_arc_')[0] : studentRecord.nis)}%0A%0A` +
      `*Rincian Belanja:*%0A${itemsListText}%0A%0A` +
      `*Total Tagihan:* Rp ${totalAmount.toLocaleString('id-ID')}%0A` +
      `*Metode Pembayaran:* ${paymentText}` +
      `${notesText}%0A%0A` +
      `Mohon segera diproses. Terima kasih!`;

    const waLink = `https://wa.me/${targetWA}?text=${waMessage}`;

    revalidatePath('/jastip');
    revalidatePath('/home/jastip');
    revalidatePath('/home');
    revalidatePath('/dashboard');
    revalidatePath('/today-transactions');

    return {
      success: true,
      message: 'Pesanan jastip berhasil dibuat!',
      data: {
        orderId: createdId,
        waLink,
        totalAmount
      }
    };
  } catch (err: any) {
    console.error('createStudentJastipOrderAction err', err);
    return { success: false, message: err.message || 'Gagal memproses pesanan jastip.' };
  }
}

export async function getStudentJastipOrdersAction(): Promise<JastipOrder[]> {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();

    let studentId = user?.id;

    if (!studentId) {
      const cookieStore = await cookies();
      const studentCookie = cookieStore.get('student_session')?.value;
      if (studentCookie) {
        try {
          const parsed = JSON.parse(studentCookie);
          studentId = parsed.id;
        } catch {}
      }
    }

    if (!studentId) return [];

    const { data, error } = await supabaseAdmin
      .from('jastip_orders')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_STUDENT_JASTIP_ORDERS_ERROR]', error);
      return [];
    }

    return (data as JastipOrder[]) || [];
  } catch (err) {
    console.error('getStudentJastipOrdersAction err', err);
    return [];
  }
}
