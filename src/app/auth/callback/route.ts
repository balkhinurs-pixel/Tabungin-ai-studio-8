
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session) {
      revalidatePath('/', 'layout');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (session.user.email?.endsWith('.supabase.user')) {
        return NextResponse.redirect(`${origin}/home`);
      }
      
      if (profile && profile.role === 'ADMIN') {
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?message=Gagal melakukan autentikasi pengguna`)
}
