
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function updateUserByAdmin(userId: string, data: { plan: 'TRIAL' | 'PRO', custom_quota: number | null }) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      plan: data.plan,
      custom_quota: data.custom_quota
    })
    .eq('id', userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  return { success: true, message: 'Profil pengguna berhasil diperbarui.' };
}
