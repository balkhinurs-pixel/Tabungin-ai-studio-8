'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur-lg sm:hidden">
      <div className="flex h-20 items-center justify-around">
        {NAV_ITEMS.map((item) => {
          if (item.isCentral) {
            return (
              <div key={item.href} className="relative -top-6">
                <Button asChild className="h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90" size="icon">
                  <Link href={item.href}>
                    <item.icon className="h-8 w-8 text-primary-foreground" />
                  </Link>
                </Button>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-md transition-colors w-16',
                pathname.startsWith(item.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium text-center">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
