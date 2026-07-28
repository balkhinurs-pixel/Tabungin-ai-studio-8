'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MorphingSpinner } from '@/components/ui/morphing-spinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <MorphingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Menghubungkan...</p>
    </div>
  );
}