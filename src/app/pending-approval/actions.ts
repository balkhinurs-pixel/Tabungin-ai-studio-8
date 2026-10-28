'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getPendingTeacherInfo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, adminWhatsApp: '6289522537711' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Ambil profil guru
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Ambil nomor kontak Admin Pusat jika ada tersimpan di profil ADMIN
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('phone_number')
    .eq('role', 'ADMIN')
    .not('phone_number', 'is', null)
    .limit(1)
    .maybeSingle();

  const adminWhatsApp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || adminProfile?.phone_number || '6289522537711';

  return {
    user: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
    profile,
    adminWhatsApp,
  };
}

export async function updateTeacherPendingInfo(data: {
  full_name: string;
  school_name: string;
  phone_number: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Sesi pengguna tidak valid.' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const updates: Record<string, any> = {
    full_name: data.full_name?.trim() || null,
    school_name: data.school_name?.trim() || null,
    phone_number: data.phone_number?.trim() || null,
  };

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  // Juga sinkronkan ke auth user_metadata
  try {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        full_name: updates.full_name,
        school_name: updates.school_name,
        phone_number: updates.phone_number,
      },
    });
  } catch (err) {
    console.warn('Could not sync user_metadata:', err);
  }

  revalidatePath('/pending-approval');
  return { success: true, message: 'Data identitas berhasil diperbarui.' };
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
