'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, User, LogOut, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@supabase/supabase-js';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Profile } from '@/types';

export default function Header() {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (authUser && !userError) {
        setUser(authUser);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profileData && !profileError) {
          setProfile(profileData);
        }
      }
    };
    fetchUserAndProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-[100] flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
        <div className="font-bold text-lg">
            {/* Branding can be here if needed */}
        </div>
      <div className='flex items-center gap-2'>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.email ? user.email.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className='flex flex-col'>
                <span>Akun Saya</span>
                <span className='text-xs text-muted-foreground font-normal truncate'>{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><SettingsIcon className="mr-2 h-4 w-4" /><span>Pengaturan</span></Link>
            </DropdownMenuItem>
            {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard"><Shield className="mr-2 h-4 w-4" /><span>Panel Admin</span></Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
