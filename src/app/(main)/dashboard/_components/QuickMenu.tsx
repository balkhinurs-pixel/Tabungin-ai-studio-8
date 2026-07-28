'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  History, 
  Banknote, 
  QrCode, 
  ShieldCheck, 
  FileText, 
  Settings, 
  MonitorSmartphone,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  bg: string;
  description: string;
}

const ALL_MENUS: MenuItem[] = [
  { icon: Users, label: 'Siswa', description: 'Kelola data profil siswa', href: '/profiles', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: QrCode, label: 'Scan', description: 'Pindai kartu transaksi', href: '/transactions', color: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: History, label: 'Jurnal', description: 'Riwayat transaksi harian', href: '/today-transactions', color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: Banknote, label: 'Keuangan', description: 'Manajemen omzet & kantin', href: '/settlement', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: FileText, label: 'Laporan', description: 'Rekap tabungan & ekspor PDF', href: '/reports', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: QrCode, label: 'Cetak', description: 'Desain & cetak kartu QR', href: '/print-cards', color: 'text-rose-600', bg: 'bg-rose-50' },
  { icon: MonitorSmartphone, label: 'ATM', description: 'Tampilan Kiosk ATM siswa', href: '/kiosk', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { icon: ShieldCheck, label: 'Aktivasi', description: 'Upgrade akun ke versi PRO', href: '/activation', color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Settings, label: 'Opsi', description: 'Identitas sekolah & backup', href: '/settings', color: 'text-gray-600', bg: 'bg-gray-100' },
];

export default function QuickMenu() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const totalScrollable = scrollWidth - clientWidth;
      if (totalScrollable > 0) {
        setScrollProgress((scrollLeft / totalScrollable) * 100);
      }
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="w-full">
      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-6 px-2 pb-6 pt-2 no-scrollbar snap-x snap-mandatory"
      >
        {ALL_MENUS.map((menu, index) => (
          <Link 
            key={index} 
            href={menu.href} 
            className="flex flex-col items-center gap-3 min-w-[72px] snap-center group"
          >
            <div className={cn(
              "h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 shadow-sm border-2 border-white bg-white group-active:scale-90",
              "group-hover:shadow-md group-hover:-translate-y-1"
            )}>
              <menu.icon className={cn("h-7 w-7", menu.color)} />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight text-center leading-tight">
              {menu.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Modern Progress Indicator ala Shopee */}
      <div className="flex justify-center mt-2">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-150 ease-out rounded-full"
            style={{ 
              width: '40%', 
              transform: `translateX(${(scrollProgress * 0.6)}px)` 
            }}
          />
        </div>
      </div>
    </div>
  );
}