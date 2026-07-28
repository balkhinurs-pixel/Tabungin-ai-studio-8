'use client';

import React from 'react';
import usePWAInstall from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLogo } from './AppLogo';
import { Download, X } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
  const { installPrompt, handleInstall, handleDismiss, handleDismissPermanently } = usePWAInstall();

  if (!installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-500">
      <Card className="overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <CardContent className="p-5">
          <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 shrink-0 p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm">
                <AppLogo variant="compact" className="scale-75" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Pasang Tabungin</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Akses lebih cepat & lancar dari layar utama.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleInstall} 
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Install Sekarang
            </Button>
            
            <button 
              onClick={handleDismissPermanently}
              className="text-[10px] text-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium uppercase tracking-wider py-1"
            >
              Jangan tanyakan lagi
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
