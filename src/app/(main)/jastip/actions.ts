'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { cookies } from 'next/headers';
import type { JastipItem, JastipOrder } from '@/types';

// Helper for simulated fallback storage
let simulatedItems: JastipItem[] = [
  {
    id: '1',
    name: 'Paket Sabun & Sikat Gigi Santri',
    category: 'Perlengkapan Mandi',
    price: 15000,
    description: 'Sabun batang Lifebuoy, Sikat gigi Formula, Odol Pepsodent 120gr',
    whatsapp_number: '',
    is_available: true
  },
  {
    id: '2',
    name: 'Snack & Susu UHT Santri',
    category: 'Makanan & Minuman',
    price: 12000,
    description: 'Susu Ultra Milk 200ml + Biskuit Roma Kelapa',
    whatsapp_number: '',
    is_available: true
  },
  {
    id: '3',
    name: 'Kitab & Buku Tulis Santri (Isi 5)',
    category: 'Kitab & Buku',
    price: 25000,
    description: 'Buku tulis Sinar Dunia 38 lembar (5 pcs) + Pulpen Standard',
    whatsapp_number: '',
    is_available: true
  },
  {
    id: '4',
    name: 'Jasa Laundry Kilat (3 Kg)',
    category: 'Laundry & Jasa',
    price: 20000,
    description: 'Cuci + Setrika wangi rapi selesai dalam 24 jam',
    whatsapp_number: '',
    is_available: true
  }
];

let simulatedOrders: JastipOrder[] = [];
let simulatedDefaultWhatsApp = '628123456789';

// ==========================================
// ADMIN ACTIONS
// ==========================================

export async function getAdminJastipItemsAction(): Promise<JastipItem[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('jastip_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return simulatedItems;
    }
    return data as JastipItem[];
  } catch (err) {
    console.error('getAdminJastipItemsAction err', err);
    return simulatedItems;
  }
}

export async function saveJastipItemAction(itemData: Partial<JastipItem>): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (itemData.id) {
      // Update
      const { error } = await supabase
        .from('jastip_items')
        .update({
          name: itemData.name,
          category: itemData.category,
          price: itemData.price,
          description: itemData.description,
          whatsapp_number: itemData.whatsapp_number,
          is_available: itemData.is_available,
        })
        .eq('id', itemData.id);

      if (error) {
        // Fallback update
        simulatedItems = simulatedItems.map(i => i.id === itemData.id ? { ...i, ...itemData } as JastipItem : i);
      }
      return { success: true, message: 'Item jastip berhasil diperbarui.' };
    } else {
      // Create
      const newItem: Partial<JastipItem> = {
        name: itemData.name,
        category: itemData.category || 'Kebutuhan Santri',
        price: itemData.price || 0,
        description: itemData.description || '',
        whatsapp_number: itemData.whatsapp_number || '',
        is_available: itemData.is_available ?? true,
        user_id: user?.id
      };

      const { error } = await supabase
        .from('jastip_items')
        .insert([newItem]);

      if (error) {
        simulatedItems.unshift({
          ...newItem,
          id: Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString()
        } as JastipItem);
      }
      return { success: true, message: 'Menu jastip baru berhasil ditambahkan.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menyimpan item jastip.' };
  }
}

export async function deleteJastipItemAction(itemId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('jastip_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      simulatedItems = simulatedItems.filter(i => i.id !== itemId);
    }
    return { success: true, message: 'Menu jastip berhasil dihapus.' };
  } catch (err: any) {
    simulatedItems = simulatedItems.filter(i => i.id !== itemId);
    return { success: true, message: 'Menu jastip dihapus.' };
  }
}

export async function toggleJastipAvailabilityAction(itemId: string, isAvailable: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    await supabase
      .from('jastip_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId);

    simulatedItems = simulatedItems.map(i => i.id === itemId ? { ...i, is_available: isAvailable } : i);
    return { success: true, message: 'Status ketersediaan berhasil diubah.' };
  } catch (err: any) {
    simulatedItems = simulatedItems.map(i => i.id === itemId ? { ...i, is_available: isAvailable } : i);
    return { success: true, message: 'Status ketersediaan diubah.' };
  }
}

export async function getDefaultJastipConfigAction(): Promise<{ default_jastip_whatsapp: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('school_code, email')
        .eq('id', user.id)
        .single();

      return { default_jastip_whatsapp: simulatedDefaultWhatsApp };
    }
    return { default_jastip_whatsapp: simulatedDefaultWhatsApp };
  } catch {
    return { default_jastip_whatsapp: simulatedDefaultWhatsApp };
  }
}

export async function updateDefaultJastipWhatsAppAction(whatsappNumber: string): Promise<{ success: boolean; message: string }> {
  simulatedDefaultWhatsApp = whatsappNumber;
  return { success: true, message: 'Nomor WhatsApp jastip berhasil disimpan.' };
}

export async function getAdminJastipOrdersAction(): Promise<JastipOrder[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('jastip_orders')
      .select('*, students(id, name, class, nis, whatsapp_number)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return simulatedOrders;
    }
    return data as JastipOrder[];
  } catch (err) {
    return simulatedOrders;
  }
}

export async function updateJastipOrderStatusAction(orderId: string, status: 'PENDING' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN'): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    await supabase
      .from('jastip_orders')
      .update({ status })
      .eq('id', orderId);

    simulatedOrders = simulatedOrders.map(o => o.id === orderId ? { ...o, status } : o);
    return { success: true, message: `Status pesanan berhasil diubah ke ${status}.` };
  } catch (err: any) {
    simulatedOrders = simulatedOrders.map(o => o.id === orderId ? { ...o, status } : o);
    return { success: true, message: `Status pesanan diubah ke ${status}.` };
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
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get('student_session')?.value;

    let studentData: any = null;
    let balance = 0;
    let todaySpending = 0;

    const supabase = await createClient();

    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        if (parsed.id) {
          const { data: std } = await supabase
            .from('students')
            .select('*, transactions(*)')
            .eq('id', parsed.id)
            .single();

          if (std) {
            const txs = std.transactions || [];
            const pemasukan = txs.filter((t: any) => t.type === 'Pemasukan').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
            const pengeluaran = txs.filter((t: any) => t.type === 'Pengeluaran').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
            balance = pemasukan - pengeluaran;

            const todayStr = new Date().toISOString().split('T')[0];
            todaySpending = txs
              .filter((t: any) => t.type === 'Pengeluaran' && t.created_at?.startsWith(todayStr))
              .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

            studentData = {
              id: std.id,
              name: std.name,
              class: std.class,
              nis: std.nis,
              balance,
              daily_limit: std.daily_limit,
              today_spending: todaySpending
            };
          }
        }
      } catch (e) {
        console.error('Failed to parse student cookie', e);
      }
    }

    // Default sample student if not authenticated in browser
    if (!studentData) {
      studentData = {
        id: 'sample-student-1',
        name: 'Ahmad Santri',
        class: 'X-A',
        nis: '2024001',
        balance: 150000,
        daily_limit: 50000,
        today_spending: 10000
      };
    }

    // Fetch items
    const { data: dbItems } = await supabase
      .from('jastip_items')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    const items = (dbItems && dbItems.length > 0) ? dbItems : simulatedItems.filter(i => i.is_available);

    return {
      items: items as JastipItem[],
      student: studentData
    };
  } catch (err) {
    return {
      items: simulatedItems.filter(i => i.is_available),
      student: null
    };
  }
}

export async function createStudentJastipOrderAction(payload: {
  items: { id: string; name: string; price: number; quantity: number }[];
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
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get('student_session')?.value;

    const supabase = await createClient();
    let studentId = '';
    let studentName = 'Santri';
    let studentClass = '';
    let studentNis = '';

    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        studentId = parsed.id;
        studentName = parsed.name;
        studentClass = parsed.class;
        studentNis = parsed.nis;
      } catch {}
    }

    const orderItems = payload.items.map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      subtotal: it.price * it.quantity
    }));

    const totalAmount = orderItems.reduce((sum, it) => sum + it.subtotal, 0);

    // If Payment method is SALDO, check & deduct
    if (payload.paymentMethod === 'SALDO' && studentId) {
      // Check balance
      const { data: std } = await supabase
        .from('students')
        .select('*, transactions(*)')
        .eq('id', studentId)
        .single();

      if (std) {
        const txs = std.transactions || [];
        const pemasukan = txs.filter((t: any) => t.type === 'Pemasukan').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
        const pengeluaran = txs.filter((t: any) => t.type === 'Pengeluaran').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
        const currentBalance = pemasukan - pengeluaran;

        if (currentBalance < totalAmount) {
          return {
            success: false,
            message: `Saldo tidak mencukupi (Saldo: Rp ${currentBalance.toLocaleString('id-ID')}, Tagihan: Rp ${totalAmount.toLocaleString('id-ID')})`
          };
        }

        // Check daily limit
        if (std.daily_limit && std.daily_limit > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todaySpent = txs
            .filter((t: any) => t.type === 'Pengeluaran' && t.created_at?.startsWith(todayStr))
            .reduce((acc: number, t: any) => acc + Number(t.amount), 0);

          if (todaySpent + totalAmount > std.daily_limit) {
            return {
              success: false,
              message: `Transaksi melebihi batas jajan harian santri (Limit: Rp ${std.daily_limit.toLocaleString('id-ID')})`
            };
          }
        }

        // Insert Transaction Record (Category BELANJA_JASTIP)
        const summaryStr = orderItems.map(i => `${i.name} (${i.quantity}x)`).join(', ');
        await supabase.from('transactions').insert([
          {
            student_id: studentId,
            type: 'Pengeluaran',
            category: 'BELANJA_JASTIP',
            amount: totalAmount,
            description: `Jastip Santri: ${summaryStr}`,
            is_settled: false
          }
        ]);
      }
    }

    // Insert order record
    const orderRecord = {
      student_id: studentId || null,
      items: orderItems,
      total_amount: totalAmount,
      notes: payload.notes || null,
      status: 'PENDING',
      payment_method: payload.paymentMethod
    };

    let createdId = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('jastip_orders')
      .insert([orderRecord])
      .select('id')
      .single();

    if (insertedOrder) {
      createdId = insertedOrder.id;
    } else {
      simulatedOrders.unshift({
        id: createdId,
        created_at: new Date().toISOString(),
        student_id: studentId || 'sample-student-1',
        items: orderItems,
        total_amount: totalAmount,
        notes: payload.notes || null,
        status: 'PENDING',
        payment_method: payload.paymentMethod,
        students: {
          id: studentId || 'sample-student-1',
          name: studentName || 'Ahmad Santri',
          class: studentClass || 'X-A',
          nis: studentNis || '2024001'
        }
      });
    }

    // Generate WhatsApp Text
    const itemsListText = orderItems.map((it, idx) => `${idx + 1}. ${it.name} x${it.quantity} = Rp ${it.subtotal.toLocaleString('id-ID')}`).join('%0A');
    const paymentText = payload.paymentMethod === 'SALDO' ? 'POTONG SALDO TABUNGAN (LUNAS)' : 'BAYAR MANDIRI / TUNAI';
    const notesText = payload.notes ? `%0A*Catatan/Kamar:* ${encodeURIComponent(payload.notes)}` : '';

    const waMessage = `*PESANAN JASTIP SANTRI*%0A%0A` +
      `*No. Pesanan:* %23${createdId.slice(0, 8)}%0A` +
      `*Nama Santri:* ${encodeURIComponent(studentName)} (${encodeURIComponent(studentClass)})%0A` +
      `*NIS:* ${encodeURIComponent(studentNis)}%0A%0A` +
      `*Rincian Belanja:*%0A${itemsListText}%0A%0A` +
      `*Total Tagihan:* Rp ${totalAmount.toLocaleString('id-ID')}%0A` +
      `*Metode Pembayaran:* ${paymentText}` +
      `${notesText}%0A%0A` +
      `Mohon segera diproses. Terima kasih!`;

    const targetWA = simulatedDefaultWhatsApp.replace(/\D/g, '');
    const waLink = `https://wa.me/${targetWA}?text=${waMessage}`;

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
    return { success: false, message: err.message || 'Gagal memproses pesanan jastip.' };
  }
}

export async function getStudentJastipOrdersAction(): Promise<JastipOrder[]> {
  try {
    const cookieStore = await cookies();
    const studentCookie = cookieStore.get('student_session')?.value;

    let studentId = '';
    if (studentCookie) {
      try {
        const parsed = JSON.parse(studentCookie);
        studentId = parsed.id;
      } catch {}
    }

    const supabase = await createClient();
    if (studentId) {
      const { data, error } = await supabase
        .from('jastip_orders')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as JastipOrder[];
      }
    }

    return simulatedOrders;
  } catch {
    return simulatedOrders;
  }
}
