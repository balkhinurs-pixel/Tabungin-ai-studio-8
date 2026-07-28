
'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function changeStudentPinAction(newPin: string) {
  const supabase = createClient();

  if (!newPin || newPin.length < 6) {
    return { success: false, message: 'PIN harus minimal 6 digit.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPin
  });

  if (error) {
    console.error('Error changing student PIN:', error.message);
    return { success: false, message: `Gagal mengubah PIN: ${error.message}` };
  }

  revalidatePath('/home');
  return { success: true, message: 'PIN Anda berhasil diperbarui.' };
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
