'use client';

import { 
  History, 
  LayoutGrid, 
  LogOut,
  ScanLine,
  UtensilsCrossed
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';

const CANTINE_NAV = [
    { title: 'Outlet', icon: LayoutGrid, href: '/cantine/outlet' },
    { title: 'Katalog & Stok', icon: UtensilsCrossed, href: '/cantine/menu' },
    { title: 'POS Kasir', icon: ScanLine, href: '/cantine/payment' },
    { title: 'Riwayat Transaksi', icon: History, href: '/cantine/history' },
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
    <div className="min-h-screen bg-gray-50/30">
        {/* Modern Header with Desktop Navbar */}
        <header className="sticky top-0 z-50 h-16 border-b bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shadow-sm">
            <div className="flex items-center gap-3">
                <Link href="/cantine/outlet" className="flex items-center gap-2">
                    <h1 className="text-xl font-black tracking-tighter text-gray-900">
                        Tabung<span className="text-primary">.in</span>
                    </h1>
                    <span className="bg-primary/10 text-primary text-[10px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-md border border-primary/20">
                        POS Kantin
                    </span>
                </Link>
            </div>

            {/* Desktop Navbar Menu */}
            <nav className="hidden sm:flex items-center gap-1 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/70">
                {CANTINE_NAV.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all",
                                isActive
                                    ? "bg-white text-primary shadow-sm border border-gray-200/50"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="flex items-center gap-2">
                <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-bold text-xs p-2 sm:px-3.5 sm:py-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline font-black">Keluar</span>
                </button>
            </div>
        </header>

        <main className="p-4 sm:p-6 pb-28 sm:pb-12 max-w-7xl mx-auto w-full">
            {children}
        </main>

        {/* Mobile Bottom POS Nav - Reordered for professional look */}
        <nav className="fixed bottom-0 inset-x-0 h-20 bg-white border-t flex items-center justify-around px-4 z-50 sm:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <Link 
                href="/cantine/outlet"
                className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    pathname === '/cantine/outlet' ? "text-primary font-bold" : "text-gray-400"
                )}
            >
                <LayoutGrid className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-widest">Outlet</span>
            </Link>

            <Link 
                href="/cantine/menu"
                className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    pathname === '/cantine/menu' ? "text-primary font-bold" : "text-gray-400"
                )}
            >
                <UtensilsCrossed className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-widest">Katalog</span>
            </Link>

            <Link 
                href="/cantine/payment"
                className="relative -top-5 h-14 w-14 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white border-4 border-white transition-transform active:scale-90"
            >
                <ScanLine className="h-7 w-7" />
            </Link>

            <Link 
                href="/cantine/history"
                className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    pathname === '/cantine/history' ? "text-primary font-bold" : "text-gray-400"
                )}
            >
                <History className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-widest">Riwayat</span>
            </Link>
        </nav>
    </div>
  );
}
