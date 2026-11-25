'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Bell,
  User,
  LogOut,
  Shield,
  Settings as SettingsIcon,
  ChevronDown,
  History,
  FileText,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUser } from '@supabase/supabase-js';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

export default function Header() {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (authUser && !userError) {
        setUser(authUser);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, plan, role, school_name, full_name')
          .eq('id', authUser.id)
          .single();

        if (profileData && !profileError) {
          setProfile(profileData as Profile);
        }
      }
    };
    fetchUserAndProfile();
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isAdmin = profile?.role === 'ADMIN';
  const avatarInitial = (
    profile?.school_name ||
    profile?.full_name ||
    user?.email ||
    'T'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const accountDropdownContent = (
    <DropdownMenuContent align="end" className="w-56 z-[120]">
      <DropdownMenuLabel className="flex flex-col">
        <span>{profile?.school_name || 'Akun Saya'}</span>
        <span className="text-xs text-muted-foreground font-normal truncate">
          {user?.email}
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/settings">
          <SettingsIcon className="mr-2 h-4 w-4" />
          <span>Pengaturan</span>
        </Link>
      </DropdownMenuItem>
      {isAdmin && (
        <DropdownMenuItem asChild>
          <Link href="/admin/dashboard">
            <Shield className="mr-2 h-4 w-4" />
            <span>Panel Admin</span>
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={handleLogout}
        className="text-red-500 focus:text-red-500"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Keluar</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const notificationDropdownContent = (
    <DropdownMenuContent align="end" className="w-64 z-[120]">
      <DropdownMenuLabel>Aktivitas & Laporan</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/today-transactions" className="cursor-pointer">
          <History className="mr-2 h-4 w-4 text-blue-600" />
          <span>Jurnal Transaksi Hari Ini</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/reports" className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4 text-emerald-600" />
          <span>Rekap & Laporan Bulanan</span>
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <>
      {/* Mobile Header - Sesuai Mockup */}
      <header
        className={cn(
          'sm:hidden sticky top-0 z-[100] flex items-center justify-between px-4 py-3 transition-all duration-200',
          isDashboard
            ? isScrolled
              ? 'bg-[#0B5AD1]/95 backdrop-blur-md shadow-md'
              : 'bg-transparent'
            : 'bg-gradient-to-r from-[#0A52C4] via-[#136FE5] to-[#2890F5] shadow-md rounded-b-[20px]'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 rounded-full bg-white p-0.5 shadow-md ring-2 ring-white/30 flex items-center justify-center shrink-0 overflow-hidden">
            <Image
              src="/logo-icon.png"
              alt="Tabungin"
              width={36}
              height={36}
              className="object-contain rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold text-white leading-tight tracking-tight">
              Tabungin
            </h1>
            <p className="text-[11px] font-normal text-white/85 leading-tight truncate">
              Sistem Tabungan Santri
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Notifikasi"
                className="relative p-2 rounded-full text-white hover:bg-white/15 active:scale-95 transition-all"
              >
                <Bell className="h-[22px] w-[22px] stroke-[2]" />
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#FF3B30] ring-2 ring-[#136FE5]" />
              </button>
            </DropdownMenuTrigger>
            {notificationDropdownContent}
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menu Akun"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/25 backdrop-blur-md border border-white/25 rounded-full pl-1 pr-2.5 py-1 shadow-sm active:scale-95 transition-all"
              >
                <span className="h-7 w-7 rounded-full bg-[#B9DBFF] text-[#0A52C4] font-bold text-xs flex items-center justify-center">
                  {avatarInitial}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            {accountDropdownContent}
          </DropdownMenu>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden sm:flex sticky top-0 z-[100] h-16 items-center justify-between gap-4 border-b bg-background px-6 shadow-sm">
        <div className="font-bold text-lg text-slate-800 truncate">
          {profile?.school_name || 'Tabungin'}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#FF3B30]" />
              </Button>
            </DropdownMenuTrigger>
            {notificationDropdownContent}
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                    {user?.email ? (
                      avatarInitial
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            {accountDropdownContent}
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
