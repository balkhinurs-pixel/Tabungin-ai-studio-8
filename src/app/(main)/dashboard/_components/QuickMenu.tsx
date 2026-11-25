'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Scan,
  ClipboardList,
  Wallet,
  ShieldCheck,
  FileText,
  Settings,
  MonitorSmartphone,
  ShoppingBag,
  MessageSquare,
  QrCode,
  ChevronDown,
  ChevronUp,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  iconColor: string;
  boxGradient: string;
  subtitle: string;
}

const PRIMARY_MENUS: MenuItem[] = [
  {
    icon: Users,
    label: 'Siswa',
    subtitle: 'Kelola data santri',
    href: '/profiles',
    iconColor: 'text-[#0D6EFD]',
    boxGradient: 'from-[#E8F2FF] to-[#D2E6FF]',
  },
  {
    icon: Scan,
    label: 'Scan',
    subtitle: 'Setor & tarik via barcode',
    href: '/transactions',
    iconColor: 'text-[#EA7A00]',
    boxGradient: 'from-[#FFF4E0] to-[#FFE7C2]',
  },
  {
    icon: ClipboardList,
    label: 'Jurnal',
    subtitle: 'Catatan transaksi',
    href: '/today-transactions',
    iconColor: 'text-[#7C1FE0]',
    boxGradient: 'from-[#F3E8FF] to-[#E6D1FF]',
  },
  {
    icon: Wallet,
    label: 'Keuangan',
    subtitle: 'Rekap saldo & laporan',
    href: '/settlement',
    iconColor: 'text-[#16A34A]',
    boxGradient: 'from-[#E6FAEE] to-[#CBF4DC]',
  },
];

const EXTRA_MENUS: MenuItem[] = [
  {
    icon: ShoppingBag,
    label: 'Jastip',
    subtitle: 'Pesanan santri',
    href: '/jastip',
    iconColor: 'text-pink-600',
    boxGradient: 'from-pink-50 to-pink-100',
  },
  {
    icon: MessageSquare,
    label: 'Setting WA',
    subtitle: 'Notifikasi gateway',
    href: '/whatsapp',
    iconColor: 'text-emerald-600',
    boxGradient: 'from-emerald-50 to-emerald-100',
  },
  {
    icon: FileText,
    label: 'Laporan',
    subtitle: 'Ekspor PDF & rekap',
    href: '/reports',
    iconColor: 'text-blue-600',
    boxGradient: 'from-blue-50 to-blue-100',
  },
  {
    icon: QrCode,
    label: 'Cetak',
    subtitle: 'Kartu QR santri',
    href: '/print-cards',
    iconColor: 'text-rose-600',
    boxGradient: 'from-rose-50 to-rose-100',
  },
  {
    icon: MonitorSmartphone,
    label: 'ATM',
    subtitle: 'Kiosk ATM siswa',
    href: '/kiosk',
    iconColor: 'text-indigo-600',
    boxGradient: 'from-indigo-50 to-indigo-100',
  },
  {
    icon: ShieldCheck,
    label: 'Aktivasi',
    subtitle: 'Upgrade ke PRO',
    href: '/activation',
    iconColor: 'text-amber-600',
    boxGradient: 'from-amber-50 to-amber-100',
  },
  {
    icon: Settings,
    label: 'Pengaturan',
    subtitle: 'Sekolah & backup',
    href: '/settings',
    iconColor: 'text-slate-600',
    boxGradient: 'from-slate-100 to-slate-200',
  },
];

function MenuCardTile({ menu }: { menu: MenuItem }) {
  const Icon = menu.icon;
  return (
    <Link
      href={menu.href}
      className="flex flex-col items-center text-center rounded-2xl bg-[#F8FAFD] hover:bg-[#F0F5FC] border border-slate-100 px-1.5 py-2.5 transition-all active:scale-95 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.06)] group"
    >
      <div
        className={cn(
          'h-11 w-11 sm:h-12 sm:w-12 rounded-[14px] bg-gradient-to-b flex items-center justify-center mb-2 shadow-xs transition-transform duration-200 group-hover:-translate-y-0.5',
          menu.boxGradient
        )}
      >
        <Icon className={cn('h-[22px] w-[22px] sm:h-6 sm:w-6 stroke-[2.2]', menu.iconColor)} />
      </div>
      <span className="text-[12px] sm:text-[13px] font-bold text-slate-900 leading-tight">
        {menu.label}
      </span>
      <span className="text-[9.5px] sm:text-[10.5px] text-slate-500 font-medium leading-[1.2] mt-1 line-clamp-2 px-0.5">
        {menu.subtitle}
      </span>
    </Link>
  );
}

export default function QuickMenu() {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-white rounded-[20px] border border-blue-100/80 shadow-[0_6px_22px_-6px_rgba(30,64,175,0.09)] p-3 sm:p-4 space-y-2.5">
      {/* 4 Menu Utama - Persis Layout Mockup */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {PRIMARY_MENUS.map((menu) => (
          <MenuCardTile key={menu.href} menu={menu} />
        ))}
      </div>

      {/* Expandable 7 Menu Tambahan */}
      {showMore && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-1.5 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
          {EXTRA_MENUS.map((menu) => (
            <MenuCardTile key={menu.href} menu={menu} />
          ))}
        </div>
      )}

      {/* Toggle Ringkas untuk Menu Lainnya */}
      <div className="flex justify-center pt-0.5">
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 px-3 py-1 rounded-full bg-slate-50 hover:bg-blue-50/70 transition-colors"
        >
          <span>{showMore ? 'Tutup Menu Lainnya' : 'Menu Lainnya (7)'}</span>
          {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}