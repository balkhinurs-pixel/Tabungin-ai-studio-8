'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Jangan tampilkan jika pengguna sudah memilih untuk tidak ditanya lagi
      if (localStorage.getItem('pwa-dismissed-permanently') === 'true') {
        return;
      }

      // Mencegah browser menampilkan prompt default
      event.preventDefault();
      
      // Jangan tampilkan jika sudah dalam mode standalone (terinstal)
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
          return;
      }
      
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
    }
    setInstallPrompt(null);
  };
  
  const handleDismiss = () => {
    setInstallPrompt(null);
  };

  const handleDismissPermanently = () => {
    localStorage.setItem('pwa-dismissed-permanently', 'true');
    setInstallPrompt(null);
  };

  return { installPrompt, handleInstall, handleDismiss, handleDismissPermanently };
};

export default usePWAInstall;
