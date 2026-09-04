
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface RegisterRoleResult {
  success: boolean;
  message: string;
}

export async function registerUserRoleAction(params: {
  schoolName: string;
  schoolCode: string;
  role?: string;
}): Promise<RegisterRoleResult> {
  const { schoolName, schoolCode } = params;
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
      return { success: false, message: 'Sesi tidak valid. Silakan login kembali.' };
  }

  // Pembersihan kode sekolah
  const sanitizedCode = schoolCode.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

  if (!sanitizedCode) {
    return { success: false, message: 'Kode sekolah tidak valid. Gunakan huruf atau angka.' };
  }

  try {
    // Verifikasi agar kode sekolah tidak kembar dengan sekolah lain
    const { data: duplicateCheck } = await supabaseAdmin
        .from('profiles')
        .select('id, email, school_name, role')
        .eq('school_code', sanitizedCode)
        .neq('id', user.id)
        .neq('role', 'CANTINE')
        .neq('role', 'STUDENT')
        .maybeSingle();
    
    if (duplicateCheck) {
        return {
            success: false,
            message: 'Kode sekolah ini sudah digunakan oleh sekolah lain. Mohon pilih kode yang berbeda.'
        };
    }

    // Periksa profil yang sudah ada
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      // Update profil yang ada tanpa memaksa mengubah kolom role ke nilai yang melanggar constraint check
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          school_name: schoolName.trim(),
          school_code: sanitizedCode,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
    } else {
      // Jika row profiles belum ada di database, buat row baru dengan fallback role yang aman
      let { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          school_name: schoolName.trim(),
          school_code: sanitizedCode,
          role: 'USER',
          plan: 'TRIAL'
        });

      // Fallback jika constraint hanya mengizinkan ADMIN/CANTINE
      if (insertError && insertError.message?.includes('profiles_role_check')) {
        const { error: fallbackError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            school_name: schoolName.trim(),
            school_code: sanitizedCode,
            role: 'ADMIN',
            plan: 'TRIAL'
          });
        if (fallbackError) throw fallbackError;
      } else if (insertError) {
        throw insertError;
      }
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Sekolah berhasil didaftarkan.' };

  } catch (error: any) {
    console.error('[WELCOME_REGISTER_ERR]', error);
    return { success: false, message: error.message || 'Terjadi kesalahan sistem saat mendaftarkan sekolah.' };
  }
}
