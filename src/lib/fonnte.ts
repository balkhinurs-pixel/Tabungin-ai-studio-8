/**
 * Fonnte WhatsApp Gateway Integration Service
 * Digunakan khusus untuk Notifikasi Saldo Minimal ke Orang Tua / Wali Murid.
 */

export interface FonnteSendParams {
  target: string;
  message: string;
  token: string;
  delay?: number; // Delay via Fonnte API (seconds)
}

export interface FonnteSendResult {
  success: boolean;
  message: string;
  response?: any;
}

/**
 * Mengirim 1 pesan WhatsApp melalui Fonnte API
 */
export async function sendFonnteMessage(params: FonnteSendParams): Promise<FonnteSendResult> {
  const { target, message, token, delay = 2 } = params;

  if (!token || !token.trim()) {
    return {
      success: false,
      message: 'Token API Fonnte belum dikonfigurasi.'
    };
  }

  // Format nomor HP agar bersih (misal 081234 -> 081234...)
  const cleanTarget = target.replace(/[^0-9,]/g, '');
  if (!cleanTarget) {
    return {
      success: false,
      message: 'Nomor HP tujuan tidak valid.'
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', cleanTarget);
    formData.append('message', message);
    formData.append('delay', delay.toString());
    formData.append('countryCode', '62');

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token.trim(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();

    if (data.status) {
      return {
        success: true,
        message: 'Pesan WhatsApp berhasil dikirim.',
        response: data
      };
    } else {
      return {
        success: false,
        message: data.reason || data.message || 'Gagal mengirim pesan via Fonnte.',
        response: data
      };
    }
  } catch (error: any) {
    console.error('[FONNTE_SEND_ERROR]', error);
    return {
      success: false,
      message: 'Kesalahan jaringan saat menghubungi Fonnte API: ' + (error.message || 'Error internal'),
    };
  }
}

/**
 * Helper delay (sleep) dalam milidetik untuk mencegah rate limit & ban WhatsApp
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default Template Notifikasi Saldo Rendah
 */
export const DEFAULT_LOW_BALANCE_TEMPLATE = `Halo Bapak/Ibu Wali dari *{nama}*,

Memberitahukan bahwa sisa saldo tabungan putra/putri Anda saat ini hampir habis, yaitu tinggal:
💰 *{saldo}*

Mohon lakukan pengisian ulang saldo tabungan melalui pihak sekolah agar kegiatan jajan dan transaksi siswa berjalan lancar.

Untuk memantau transaksi & sisa saldo secara real-time, silakan buka aplikasi orang tua di:
🔗 Link Login: {url_login}
🏫 Kode Sekolah: *{kode_sekolah}*
🆔 NIS: *{nis}*

Terima kasih atas perhatian Bapak/Ibu.`;
