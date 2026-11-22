import type { SupabaseClient } from '@supabase/supabase-js';

export interface DedupEntry {
  status: 'PROCESSING' | 'DONE';
  result?: any;
  transactionId?: string;
  updatedAt: number;
}

const globalForDedup = globalThis as unknown as {
  __txDedupMap?: Map<string, DedupEntry>;
  __txStudentLocks?: Map<string, Promise<void>>;
  __txHasIdempotencyColumn?: boolean | null;
};

if (!globalForDedup.__txDedupMap) {
  globalForDedup.__txDedupMap = new Map<string, DedupEntry>();
}
if (!globalForDedup.__txStudentLocks) {
  globalForDedup.__txStudentLocks = new Map<string, Promise<void>>();
}

const dedupMap = globalForDedup.__txDedupMap;
const studentLocks = globalForDedup.__txStudentLocks;

const DEDUP_TTL_MS = 15 * 60 * 1000; // 15 minutes

function cleanupOldEntries() {
  const now = Date.now();
  for (const [k, entry] of dedupMap.entries()) {
    // Stuck processing entry > 2 menit dianggap kadaluarsa
    if (entry.status === 'PROCESSING' && now - entry.updatedAt > 2 * 60 * 1000) {
      dedupMap.delete(k);
    } else if (now - entry.updatedAt > DEDUP_TTL_MS) {
      dedupMap.delete(k);
    }
  }
}

/**
 * Mengecek apakah tabel `transactions` di Supabase sudah memiliki kolom `idempotency_key`.
 * Hasil di-cache di memory agar tidak berulang kali query metadata.
 */
export async function hasIdempotencyColumn(supabaseAdmin: SupabaseClient): Promise<boolean> {
  if (globalForDedup.__txHasIdempotencyColumn !== undefined && globalForDedup.__txHasIdempotencyColumn !== null) {
    return globalForDedup.__txHasIdempotencyColumn;
  }
  try {
    const { error } = await supabaseAdmin
      .from('transactions')
      .select('idempotency_key')
      .limit(1);

    if (error && (error.message?.includes('idempotency_key') || error.code === '42703' || error.code === 'PGRST204')) {
      globalForDedup.__txHasIdempotencyColumn = false;
      return false;
    }
    if (!error) {
      globalForDedup.__txHasIdempotencyColumn = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Mengunci mutasi per siswa/scope secara berurutan (mutex) agar 2 request paralel
 * untuk siswa yang sama tidak membaca saldo lama secara bersamaan (anti race-condition).
 */
export async function withEntityLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  const previousLock = studentLocks.get(lockKey) || Promise.resolve();
  let releaseLock!: () => void;
  const currentLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const chained = previousLock.then(() => currentLock);
  studentLocks.set(lockKey, chained);

  await previousLock;
  try {
    return await fn();
  } finally {
    releaseLock();
    if (studentLocks.get(lockKey) === chained) {
      studentLocks.delete(lockKey);
    }
  }
}

/**
 * Mengecek status idempotency key dari memory dan (jika kolom tersedia) dari database.
 */
export async function lookupIdempotencyStatus(
  supabaseAdmin: SupabaseClient,
  idempotencyKey?: string
): Promise<{ found: false } | { found: true; status: 'PROCESSING' | 'DONE'; result?: any; transactionId?: string }> {
  if (!idempotencyKey) return { found: false };
  cleanupOldEntries();

  const memEntry = dedupMap.get(idempotencyKey);
  if (memEntry) {
    return {
      found: true,
      status: memEntry.status,
      result: memEntry.result,
      transactionId: memEntry.transactionId,
    };
  }

  // Fallback check ke database jika kolom idempotency_key sudah dimigrasi
  const colExists = await hasIdempotencyColumn(supabaseAdmin);
  if (colExists) {
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id, amount, type, category, description, created_at')
      .eq('idempotency_key', idempotencyKey)
      .limit(1)
      .maybeSingle();

    if (existingTx) {
      return {
        found: true,
        status: 'DONE',
        transactionId: existingTx.id,
        result: {
          success: true,
          deduplicated: true,
          transactionId: existingTx.id,
          message: 'Transaksi sudah tercatat sebelumnya (anti-dobel aktif).',
        },
      };
    }
  }

  return { found: false };
}

export function markIdempotencyProcessing(idempotencyKey?: string) {
  if (!idempotencyKey) return;
  dedupMap.set(idempotencyKey, {
    status: 'PROCESSING',
    updatedAt: Date.now(),
  });
}

export function markIdempotencyDone(idempotencyKey: string | undefined, result: any, transactionId?: string) {
  if (!idempotencyKey) return;
  dedupMap.set(idempotencyKey, {
    status: 'DONE',
    result,
    transactionId,
    updatedAt: Date.now(),
  });
}

export function clearIdempotencyProcessing(idempotencyKey?: string) {
  if (!idempotencyKey) return;
  const entry = dedupMap.get(idempotencyKey);
  if (entry && entry.status === 'PROCESSING') {
    dedupMap.delete(idempotencyKey);
  }
}

/**
 * Menyisipkan baris transaksi ke tabel `transactions` dengan dukungan otomatis `idempotency_key`
 * (jika kolomnya sudah ada di DB) dan penanganan duplikat Postgres 23505.
 */
export async function insertTransactionSafe(
  supabaseAdmin: SupabaseClient,
  payload: Record<string, any>,
  idempotencyKey?: string
): Promise<{
  error: any;
  data: { id: string } | null;
  deduplicated?: boolean;
}> {
  const colExists = idempotencyKey ? await hasIdempotencyColumn(supabaseAdmin) : false;
  const insertPayload = colExists && idempotencyKey
    ? { ...payload, idempotency_key: idempotencyKey }
    : payload;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    // Jika terjadi unique constraint violation pada idempotency_key -> berarti transaksi sudah sukses masuk
    if (error.code === '23505' && idempotencyKey && colExists) {
      const { data: existing } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return { error: null, data: existing, deduplicated: true };
      }
    }
    return { error, data: null };
  }

  return { error: null, data };
}
