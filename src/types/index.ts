
export interface Transaction {
  id: string;
  created_at?: string;
  type: 'Pemasukan' | 'Pengeluaran';
  description: string;
  amount: number;
  student_id: string; 
  user_id?: string;
  category: 'TABUNGAN' | 'BELANJA_KANTIN' | 'TARIK_TUNAI' | 'BIAYA_ADMIN';
  is_settled: boolean;
  // Joined properties
  students?: {
    id: string;
    name: string;
    class: string;
    nis: string;
  }
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  whatsapp_number?: string | null;
  daily_limit?: number | null;
  created_at?: string;
  user_id?: string;
  transactions: Transaction[];
}

export interface Profile {
  id: string;
  email?: string;
  plan: 'TRIAL' | 'PRO';
  role: 'ADMIN' | 'TEACHER' | 'CANTINE' | 'USER' | 'STUDENT';
  school_name?: string | null;
  school_code?: string | null;
  custom_quota?: number | null;
  admin_fee?: number | null;
}
