
'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function changeStudentPinAction(newPin: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Sesi login telah berakhir. Silakan login kembali.' };
  }

  const cleanPin = newPin ? newPin.trim() : '';
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return { success: false, message: 'PIN harus terdiri dari tepat 6 digit angka.' };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: cleanPin
    });

    if (error) {
      console.error('Error changing student PIN:', error.message);
      return { success: false, message: `Gagal mengubah PIN: ${error.message}` };
    }

    revalidatePath('/home');
    return { success: true, message: 'PIN Anda berhasil diperbarui.' };
  } catch (err: any) {
    console.error('Unexpected error changing student PIN:', err);
    return { success: false, message: `Terjadi kesalahan: ${err.message || err}` };
  }
}

export async function updateDailyLimitAction(limit: number | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Sesi berakhir.' };

  const { error } = await supabase
    .from('students')
    .update({ daily_limit: limit })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating daily limit:', error.message);
    return { success: false, message: 'Gagal memperbarui limit harian.' };
  }

  revalidatePath('/home');
  return { success: true, message: 'Limit harian berhasil diperbarui.' };
}
