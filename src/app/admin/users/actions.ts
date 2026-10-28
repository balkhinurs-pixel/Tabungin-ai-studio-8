'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function updateUserByAdmin(
  userId: string,
  data: {
    plan?: 'TRIAL' | 'PRO';
    custom_quota?: number | null;
    approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    full_name?: string | null;
    phone_number?: string | null;
  }
) {
  const supabaseAdmin = getSupabaseAdmin();

  const updates: Record<string, any> = {};
  if (data.plan !== undefined) updates.plan = data.plan;
  if (data.custom_quota !== undefined) updates.custom_quota = data.custom_quota;
  if (data.approval_status !== undefined) updates.approval_status = data.approval_status;
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.phone_number !== undefined) updates.phone_number = data.phone_number;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Profil pengguna berhasil diperbarui.' };
}

export async function approveUserAction(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ approval_status: 'APPROVED' })
    .eq('id', userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Akun guru berhasil disetujui (APPROVED).' };
}

export async function rejectUserAction(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ approval_status: 'REJECTED' })
    .eq('id', userId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Pendaftaran akun guru ditolak (REJECTED).' };
}

export async function ensureAdminRoleAction(userId: string, email: string) {
  if (email.toLowerCase() === 'balkhinurs@gmail.com') {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'ADMIN', approval_status: 'APPROVED' })
      .eq('id', userId);
    
    if (!error) {
      revalidatePath('/', 'layout');
      revalidatePath('/admin');
      return { success: true };
    }
  }
  return { success: false };
}
