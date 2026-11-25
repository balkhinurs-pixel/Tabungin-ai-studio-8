'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-blue-100/80 rounded-t-[24px] shadow-[0_-8px_28px_rgba(15,23,42,0.08)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-center h-[72px] px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          if (item.isCentral) {
            return (
              <div key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.title}
                  className="relative -top-5 h-[62px] w-[62px] rounded-full bg-gradient-to-b from-[#1A7BFF] to-[#0853C8] text-white ring-[5px] ring-white shadow-[0_8px_20px_-2px_rgba(13,110,253,0.55)] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <item.icon className="h-7 w-7 stroke-[2.2]" />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-1"
            >
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-[16px] px-2.5 py-1.5 min-w-[60px] transition-all',
                  isActive
                    ? 'bg-gradient-to-b from-[#1A7BFF] to-[#0854CA] text-white shadow-[0_6px_14px_-3px_rgba(13,110,253,0.5)]'
                    : 'text-slate-500 hover:text-[#0D6EFD]'
                )}
              >
                <item.icon className={cn('h-[20px] w-[20px]', isActive ? 'stroke-[2.2]' : 'stroke-[1.9]')} />
                <span className={cn('text-[10.5px] leading-tight text-center', isActive ? 'font-bold' : 'font-medium')}>
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
