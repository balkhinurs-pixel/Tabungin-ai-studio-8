export type GuardFailureKind = 'OFFLINE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'BUSINESS_ERROR';

export interface GuardResult<T> {
  ok: boolean;
  data?: T;
  failureKind?: GuardFailureKind;
  message?: string;
}

export function generateIdempotencyKey(prefix = 'tx'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any)?.message || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('unexpected response')
  );
}

/**
 * Menjalankan action transaksi dengan pengaman:
 * 1. Tolak instan jika browser offline (`navigator.onLine === false`)
 * 2. Peringatan progresif jika koneksi lambat (default 4.5 detik)
 * 3. Batas waktu (timeout) eksplisit (default 15 detik) agar UI tidak macet selamanya
 * 4. Klasifikasi error jaringan vs error validasi bisnis
 */
export async function executeWithNetworkGuard<T>(
  actionFn: () => Promise<T>,
  options?: {
    slowThresholdMs?: number;
    timeoutMs?: number;
    onSlowConnection?: () => void;
  }
): Promise<GuardResult<T>> {
  const slowMs = options?.slowThresholdMs ?? 4500;
  const timeoutMs = options?.timeoutMs ?? 15000;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      failureKind: 'OFFLINE',
      message: 'Koneksi internet terputus. Pastikan Wi-Fi atau paket data aktif lalu coba lagi.',
    };
  }

  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  if (options?.onSlowConnection) {
    slowTimer = setTimeout(() => {
      options.onSlowConnection?.();
    }, slowMs);
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new Error('__TX_TIMEOUT__'));
      }, timeoutMs);
    });

    const data = await Promise.race([actionFn(), timeoutPromise]);
    return { ok: true, data };
  } catch (err: any) {
    if (err?.message === '__TX_TIMEOUT__') {
      return {
        ok: false,
        failureKind: 'TIMEOUT',
        message: 'Koneksi terlalu lambat / waktu tunggu habis (15 detik). Cek status transaksi sebelum mengulang agar tidak dobel.',
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        ok: false,
        failureKind: 'OFFLINE',
        message: 'Koneksi terputus saat mengirim transaksi. Periksa status transaksi setelah koneksi pulih.',
      };
    }

    if (isLikelyNetworkError(err)) {
      return {
        ok: false,
        failureKind: 'NETWORK_ERROR',
        message: 'Gagal terhubung ke server (koneksi tidak stabil). Silakan cek status transaksi sebelum mengirim ulang.',
      };
    }

    return {
      ok: false,
      failureKind: 'BUSINESS_ERROR',
      message: err?.message || 'Terjadi kesalahan saat memproses transaksi.',
    };
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}
