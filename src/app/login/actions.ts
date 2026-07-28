
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = createClient();

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorMessage = encodeURIComponent(error.message);
    return redirect(`/login?message=Gagal masuk: ${errorMessage}`);
  }

  if (signInData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single();
    
    if (profile && profile.role === 'ADMIN') {
        revalidatePath('/', 'layout');
        return redirect('/admin/dashboard');
    }
    
    if (profile && profile.role === 'TEACHER') {
        revalidatePath('/', 'layout');
        return redirect('/dashboard');
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function loginWithGoogle() {
    const supabase = createClient();
    const origin = headers().get('origin');

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        console.error('Error logging in with Google:', error);
        return redirect('/login?message=Gagal masuk dengan Google');
    }

    if (data.url) {
        revalidatePath('/', 'layout');
        return redirect(data.url);
    }
    
    return redirect('/login?message=Terjadi kesalahan, silakan coba lagi');
}
