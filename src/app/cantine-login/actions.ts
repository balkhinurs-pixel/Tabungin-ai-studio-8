'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function cantineLogin(formData: FormData) {
  const schoolCodeRaw = formData.get('school_code') as string;
  const cantineId = formData.get('cantine_id') as string;
  const pin = formData.get('pin') as string;
  const supabase = createClient();

  if (!schoolCodeRaw || !cantineId || !pin) {
    return redirect('/cantine-login?message=Kode Sekolah, ID Kantin, dan PIN wajib diisi.');
  }

  const schoolCode = schoolCodeRaw.toLowerCase().trim();
  const email = `${cantineId}@${schoolCode}.kantin.user`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error) {
    console.error("Cantine login error:", error.message);
    if (error.message.includes('Invalid login credentials')) {
        return redirect('/cantine-login?message=Kode Sekolah, ID Kantin atau PIN salah.');
    }
    return redirect(`/cantine-login?message=Gagal masuk: ${error.message}`);
  }

  if (data.user) {
    revalidatePath('/', 'layout');
    return redirect(`/cantine/outlet`);
  }

  return redirect('/cantine-login?message=Terjadi kesalahan yang tidak diketahui.');
}
