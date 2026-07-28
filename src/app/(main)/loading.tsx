import { MorphingSpinner } from '@/components/ui/morphing-spinner';

export default function Loading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-6">
      <MorphingSpinner size="lg" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Memuat halaman...</p>
    </div>
  );
}