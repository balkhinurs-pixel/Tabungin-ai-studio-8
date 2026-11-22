'use client';

import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';

export default function NetworkStatusBanner() {
  const { isOnline, justReconnected, isSlowConnection } = useNetworkStatus();

  if (isOnline && !justReconnected && !isSlowConnection) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-1.5rem)] max-w-xl pointer-events-none">
      {!isOnline && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-rose-600 text-white shadow-xl border border-rose-400/50 text-xs font-bold animate-in slide-in-from-top-4 duration-300">
          <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
          <div className="flex-1 leading-snug">
            <span>Koneksi Internet Terputus.</span>{' '}
            <span className="font-normal opacity-90">
              Transaksi ditahan sementara agar tidak gagal atau dobel input.
            </span>
          </div>
        </div>
      )}

      {isOnline && justReconnected && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-xl border border-emerald-400/50 text-xs font-bold animate-in slide-in-from-top-4 duration-300">
          <Wifi className="h-4 w-4 shrink-0" />
          <div className="flex-1 leading-snug">
            <span>Koneksi Internet Pulih.</span>{' '}
            <span className="font-normal opacity-90">
              Jika sebelumnya terjadi timeout, cek riwayat transaksi sebelum input ulang.
            </span>
          </div>
        </div>
      )}

      {isOnline && !justReconnected && isSlowConnection && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500 text-amber-950 shadow-lg border border-amber-300 text-xs font-bold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="leading-snug">
            Sinyal internet terdeteksi lambat — harap tunggu proses selesai &amp; hindari klik berulang.
          </span>
        </div>
      )}
    </div>
  );
}
