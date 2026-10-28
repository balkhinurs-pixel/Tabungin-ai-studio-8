
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';

export async function signup(formData: FormData) {
  const fullName = (formData.get('full_name') as string)?.trim();
  const schoolName = (formData.get('school_name') as string)?.trim();
  const phoneNumber = (formData.get('phone_number') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const supabase = createClient();
  const origin = headers().get('origin');

  if (!email || !password || !fullName || !schoolName || !phoneNumber) {
    return redirect(`/signup?message=${encodeURIComponent('Mohon lengkapi Nama Guru, Nama Sekolah, No. WhatsApp, Email, dan Kata Sandi.')}`);
  }

  const isSuperAdminEmail = email.toLowerCase() === 'balkhinurs@gmail.com';
  const approvalStatus = isSuperAdminEmail ? 'APPROVED' : 'PENDING';

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        school_name: schoolName,
        phone_number: phoneNumber,
        approval_status: approvalStatus
      }
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    const errorMessage = encodeURIComponent(error.message);
    return redirect(`/signup?message=Gagal mendaftar: ${errorMessage}`);
  }

  if (signUpData.user) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from('profiles').upsert({
        id: signUpData.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        school_name: schoolName,
        phone_number: phoneNumber,
        role: isSuperAdminEmail ? 'ADMIN' : 'TEACHER',
        approval_status: approvalStatus
      });
    } catch (upsertErr) {
      console.warn('[SIGNUP_UPSERT_PROFILE_WARN]', upsertErr);
    }

    // Jika Super Admin, langsung ke admin dashboard
    if (isSuperAdminEmail) {
      return redirect('/admin/dashboard');
    }

    // Untuk akun guru baru, langsung arahkan ke layar konfirmasi persetujuan
    return redirect('/pending-approval');
  }
  
  const successMessage = encodeURIComponent("Akun Anda telah berhasil dibuat. Silakan cek email atau lakukan konfirmasi.");
  return redirect(`/signup?success=${successMessage}`);
}
