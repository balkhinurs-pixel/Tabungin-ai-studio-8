
import Image from 'next/image';

interface AppLogoProps {
  variant?: 'default' | 'light' | 'compact';
  className?: string;
}

export function AppLogo({ variant = 'default', className = '' }: AppLogoProps) {
  const isCompact = variant === 'compact';

  // Menggunakan logo512.png untuk kualitas HD pada tampilan UI
  return (
    <div className={className}>
      <Image
        src="/logo512.png"
        alt="Tabungin Logo"
        width={isCompact ? 120 : 180}
        height={isCompact ? 40 : 60}
        className="object-contain"
        priority
      />
    </div>
  );
}
