
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from './components/AdminSidebar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminMobileBottomNav from './components/AdminMobileBottomNav';
import Header from '@/components/layout/Header';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.push('/login');
        return;
      }
      
      // Fetch the user's profile from the 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'ADMIN') {
        toast({
            title: 'Akses Ditolak',
            description: 'Anda tidak memiliki hak untuk mengakses halaman ini.',
            variant: 'destructive',
        });
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router, supabase, toast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Memverifikasi akses admin...</p>
      </div>
    );
  }

  const MainContent = (
    <main className="p-4 sm:p-6 lg:p-8 pb-24 sm:pb-6">{children}</main>
  );

  return (
    <>
      {/* Mobile View with bottom nav */}
      <div className="sm:hidden">
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          {MainContent}
          <AdminMobileBottomNav />
        </div>
      </div>

      {/* Desktop View with sidebar */}
      <div className="hidden sm:block">
        <SidebarProvider>
          <Sidebar>
            <AdminSidebar />
          </Sidebar>
          <SidebarInset>
            <Header />
            {MainContent}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
