
export interface Transaction {
  id: string;
  created_at?: string;
  type: 'Pemasukan' | 'Pengeluaran';
  description: string;
  amount: number;
  student_id: string; 
  user_id?: string;
  category: 'TABUNGAN' | 'BELANJA_KANTIN' | 'TARIK_TUNAI' | 'BIAYA_ADMIN' | 'BELANJA_JASTIP';
  is_settled: boolean;
  // Joined properties
  students?: {
    id: string;
    name: string;
    class: string;
    nis: string;
    whatsapp_number?: string | null;
  }
}

export interface JastipItem {
  id: string;
  created_at?: string;
  name: string;
  category: string;
  price: number;
  description?: string | null;
  whatsapp_number?: string | null;
  is_available: boolean;
  image_url?: string | null;
  user_id?: string;
}

export interface JastipOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
}

export interface JastipOrder {
  id: string;
  created_at?: string;
  student_id: string;
  user_id?: string;
  items: JastipOrderItem[];
  total_amount: number;
  notes?: string | null;
  status: 'PENDING' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN';
  payment_method: 'SALDO' | 'WHATSAPP';
  students?: {
    id: string;
    name: string;
    class: string;
    nis: string;
    whatsapp_number?: string | null;
  };
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
