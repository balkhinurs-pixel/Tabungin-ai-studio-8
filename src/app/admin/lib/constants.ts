import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, Key, Receipt, Wallet } from 'lucide-react';

interface AdminNavItem {
  href: string;
  title: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', title: 'Saldo Siswa', icon: Wallet },
  { href: '/admin/users', title: 'Pengguna', icon: Users },
  { href: '/admin/transactions', title: 'Pantau Transaksi', icon: Receipt },
  { href: '/admin/codes', title: 'Kode', icon: Key },
];
