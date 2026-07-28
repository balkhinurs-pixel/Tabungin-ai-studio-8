
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface RegisterRoleResult {
  success: boolean;
  message: string;
}

export async function registerUserRoleAction(params: {
  role: 'TEACHER';
  schoolName: string;
  schoolCode: string;
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

  try {
    // Verifikasi untuk peran TEACHER (mencegah duplikasi kode sekolah antar guru)
    const { data: duplicateCheck } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('school_code', sanitizedCode)
        .eq('role', 'TEACHER')
        .neq('id', user.id)
        .maybeSingle();
    
    if (duplicateCheck) {
        return {
            success: false,
            message: 'Kode sekolah ini sudah digunakan oleh guru lain. Mohon pilih kode yang berbeda.'
        };
    }

    // Update Profil menggunakan Upsert
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        school_name: schoolName,
        school_code: sanitizedCode,
        role: 'TEACHER',
        plan: 'TRIAL' 
      }, { onConflict: 'id' });

    if (updateError) throw updateError;

    revalidatePath('/', 'layout');
    return { success: true, message: 'Sekolah berhasil didaftarkan.' };

  } catch (error: any) {
    console.error('[WELCOME_DEBUG] Error:', error);
    return { success: false, message: error.message || 'Terjadi kesalahan sistem.' };
  }
}
