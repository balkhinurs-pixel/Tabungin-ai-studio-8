import { NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session) {
      revalidatePath('/', 'layout');
      const user = session.user;
      const email = user.email?.toLowerCase();
      const isSuperAdminEmail = email === 'balkhinurs@gmail.com';

      // 1. Siswa login
      if (email?.endsWith('.supabase.user')) {
        return NextResponse.redirect(`${origin}/home`);
      }

      // 2. Kantin login
      if (email?.endsWith('.kantin.user')) {
        return NextResponse.redirect(`${origin}/cantine/outlet`);
      }

      // Ambil profil melalui service role admin agar bebas RLS
      const supabaseAdmin = getSupabaseAdmin();
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || null;

      // 3. Super Admin
      if (isSuperAdminEmail || (profile && profile.role === 'ADMIN')) {
        if (!profile || profile.role !== 'ADMIN' || profile.approval_status !== 'APPROVED') {
          await supabaseAdmin.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: metadataName || profile?.full_name || 'Admin Pusat',
            role: 'ADMIN',
            approval_status: 'APPROVED',
            plan: 'PRO',
          });
        }
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }

      // 4. Jika profil belum ada (registrasi baru lewat Google)
      if (!profile) {
        await supabaseAdmin.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: metadataName,
          role: 'TEACHER',
          approval_status: 'PENDING',
          plan: 'TRIAL',
        });
        return NextResponse.redirect(`${origin}/pending-approval`);
      }

      // 5. Cek Status Persetujuan Guru
      if (profile.approval_status === 'REJECTED') {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?message=${encodeURIComponent('Pendaftaran akun Anda ditolak oleh Admin Pusat. Silakan hubungi admin.')}`
        );
      }

      if (profile.approval_status === 'PENDING' || !profile.approval_status) {
        // Lengkapi full_name jika masih kosong
        if (!profile.full_name && metadataName) {
          await supabaseAdmin.from('profiles').update({ full_name: metadataName }).eq('id', user.id);
        }
        return NextResponse.redirect(`${origin}/pending-approval`);
      }

      // 6. Jika sudah disetujui (APPROVED)
      if (profile.approval_status === 'APPROVED') {
        if (!profile.school_code) {
          return NextResponse.redirect(`${origin}/welcome`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Jika gagal
  return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('Gagal melakukan autentikasi pengguna')}`);
}
