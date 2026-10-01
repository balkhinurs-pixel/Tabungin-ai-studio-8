'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function updateTransactionByAdmin(
  transactionId: string,
  data: {
    amount: number;
    type: 'Pemasukan' | 'Pengeluaran';
    description: string;
    category?: string;
  }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const updatePayload: Record<string, any> = {
      amount: data.amount,
      type: data.type,
      description: data.description,
    };

    if (data.category) {
      updatePayload.category = data.category;
    }

    const { error } = await supabaseAdmin
      .from('transactions')
      .update(updatePayload)
      .eq('id', transactionId);

    if (error) {
      console.error('Error updating transaction by admin:', error);
      return { success: false, message: error.message };
    }

    revalidatePath('/admin/transactions');
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Transaksi berhasil diperbarui oleh Admin Pusat.' };
  } catch (err: any) {
    console.error('Failed to update transaction:', err);
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteTransactionByAdmin(transactionId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('Error deleting transaction by admin:', error);
      return { success: false, message: error.message };
    }

    revalidatePath('/admin/transactions');
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Transaksi berhasil dihapus oleh Admin Pusat.' };
  } catch (err: any) {
    console.error('Failed to delete transaction:', err);
    return { success: false, message: err.message || 'Terjadi kesalahan sistem.' };
  }
}
