'use client';

import { useState, useEffect } from 'react';

export interface NetworkStatusState {
  isOnline: boolean;
  justReconnected: boolean;
  isSlowConnection: boolean;
}

export function useNetworkStatus(): NetworkStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setJustReconnected(false);
      }, 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateConnectionQuality = () => {
      if (!connection) return;
      const eff = connection.effectiveType;
      setIsSlowConnection(eff === 'slow-2g' || eff === '2g');
    };

    if (connection) {
      updateConnectionQuality();
      connection.addEventListener?.('change', updateConnectionQuality);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener?.('change', updateConnectionQuality);
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return { isOnline, justReconnected, isSlowConnection };
}
