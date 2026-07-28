
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/server';
import { headers } from 'next/headers';

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();
  const origin = headers().get('origin');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    const errorMessage = encodeURIComponent(error.message);
    return redirect(`/signup?message=Gagal mendaftar: ${errorMessage}`);
  }
  
  const successMessage = encodeURIComponent("Akun Anda telah berhasil dibuat.");
  return redirect(`/signup?success=${successMessage}`);
}
