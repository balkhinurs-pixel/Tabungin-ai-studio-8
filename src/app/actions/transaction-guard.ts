'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { lookupIdempotencyStatus } from '@/lib/transaction-dedup';

export interface CheckTransactionStatusResult {
  found: boolean;
  status: 'PROCESSING' | 'DONE' | 'NOT_FOUND';
  result?: any;
  message: string;
}

/**
 * Mengecek apakah transaksi dengan idempotencyKey tertentu sudah tercatat di server/database
 * (dipakai ketika koneksi terputus atau timeout di tengah pengiriman data).
 */
export async function checkTransactionStatusByKey(
  idempotencyKey: string
): Promise<CheckTransactionStatusResult> {
  if (!idempotencyKey || !idempotencyKey.trim()) {
    return {
      found: false,
      status: 'NOT_FOUND',
      message: 'Kode referensi transaksi tidak valid.',
    };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const lookup = await lookupIdempotencyStatus(supabaseAdmin, idempotencyKey.trim());

    if (!lookup.found) {
      return {
        found: false,
        status: 'NOT_FOUND',
        message: 'Transaksi belum tercatat di server. Aman untuk dicoba ulang.',
      };
    }

    if (lookup.status === 'PROCESSING') {
      return {
        found: true,
        status: 'PROCESSING',
        message: 'Transaksi masih sedang diproses di server. Tunggu beberapa detik lalu cek lagi.',
      };
    }

    return {
      found: true,
      status: 'DONE',
      result: lookup.result,
      message: 'Transaksi sudah berhasil masuk di server! Tidak perlu input ulang.',
    };
  } catch (err: any) {
    return {
      found: false,
      status: 'NOT_FOUND',
      message: 'Gagal memeriksa status ke server. Periksa koneksi internet Anda.',
    };
  }
}
