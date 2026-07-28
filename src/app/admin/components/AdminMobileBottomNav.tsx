'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_ITEMS } from '@/app/admin/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function AdminMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur-lg sm:hidden">
      <div className="flex h-20 items-center justify-around">
        {ADMIN_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-md transition-colors w-20',
              pathname.startsWith(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium text-center">{item.title}</span>
          </Link>
        ))}
        <Link
            href="/dashboard"
            className='flex flex-col items-center gap-1 p-2 rounded-md transition-colors w-20 text-muted-foreground hover:text-primary'
        >
            <ArrowLeft className="h-6 w-6" />
            <span className="text-xs font-medium text-center">Ke App</span>
        </Link>
      </div>
    </nav>
  );
}
