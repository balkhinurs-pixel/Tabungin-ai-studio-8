'use client';

import { 
  History, 
  LayoutGrid, 
  LogOut,
  ScanLine 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';

const CANTINE_NAV = [
    { title: 'Outlet', icon: LayoutGrid, href: '/cantine/outlet' },
    { title: 'Riwayat', icon: History, href: '/cantine/history' },
];

export default function CantineLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white">
        {/* Modern Header */}
        <header className="sticky top-0 z-50 h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-6">
            <h1 className="text-xl font-black tracking-tighter">
                Tabung<span className="text-primary">.in</span> <span className="text-xs opacity-50 uppercase tracking-widest font-bold">Kantin</span>
            </h1>
            <button onClick={handleLogout} className="text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors">
                <LogOut className="h-5 w-5" />
            </button>
        </header>

        <main className="p-6 pb-32 max-w-lg mx-auto">
            {children}
        </main>

        {/* Mobile Bottom POS Nav - Reordered for professional look */}
        <nav className="fixed bottom-0 inset-x-0 h-20 bg-white border-t flex items-center justify-between px-10 z-50 sm:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <Link 
                href="/cantine/outlet"
                className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    pathname === '/cantine/outlet' ? "text-primary" : "text-gray-400"
                )}
            >
                <LayoutGrid className="h-6 w-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Outlet</span>
            </Link>

            <Link 
                href="/cantine/payment"
                className="relative -top-6 h-16 w-16 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white border-4 border-white transition-transform active:scale-90"
            >
                <ScanLine className="h-8 w-8" />
            </Link>

            <Link 
                href="/cantine/history"
                className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    pathname === '/cantine/history' ? "text-primary" : "text-gray-400"
                )}
            >
                <History className="h-6 w-6" />
                <span className="text-[10px] font-black uppercase tracking-widest">Riwayat</span>
            </Link>
        </nav>
    </div>
  );
}
