
import type { LucideIcon } from 'lucide-react';
import { Home, Users, Scan, Wallet, History } from 'lucide-react';

interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
  isCentral?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    title: 'Beranda',
    icon: Home,
  },
  {
    href: '/profiles',
    title: 'Siswa',
    icon: Users,
  },
  {
    href: '/transactions',
    title: 'Scan',
    icon: Scan,
    isCentral: true,
  },
  {
    href: '/today-transactions',
    title: 'Transaksi',
    icon: History,
  },
  {
    href: '/settlement',
    title: 'Keuangan',
    icon: Wallet,
  },
];
