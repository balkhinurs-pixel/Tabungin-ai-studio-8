export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { Profile } from '@/types';
import AdminTransactionsClient, { AdminTransactionItem } from './AdminTransactionsClient';

interface PageProps {
  searchParams?: {
    userId?: string;
    studentId?: string;
    studentName?: string;
  } | Promise<{ userId?: string; studentId?: string; studentName?: string }>;
}

async function getAdminTransactionsData() {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch registered profiles (Guru & Sekolah)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, school_name, school_code, role, plan')
    .not('email', 'like', '%.supabase.user')
    .order('email', { ascending: true });

  if (profilesError) {
    console.error('Error fetching profiles in admin:', profilesError);
  }

  const teacherProfiles = (profiles || []) as Profile[];
  const profileMap = new Map<string, Profile>();
  teacherProfiles.forEach((p) => {
    profileMap.set(p.id, p);
  });

  // 2. Fetch all transactions joined with student details
  const { data: rawTransactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select(`
      id,
      amount,
      description,
      type,
      category,
      is_settled,
      created_at,
      user_id,
      student_id,
      students (
        id,
        nis,
        name,
        class,
        user_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (txError) {
    console.error('Error fetching transactions in admin:', txError);
    return { transactions: [], teachers: teacherProfiles };
  }

  const formattedTransactions: AdminTransactionItem[] = (rawTransactions || []).map((item: any) => {
    // Determine which teacher account owns this student / transaction
    const ownerUserId = item.students?.user_id || item.user_id;
    const profile = profileMap.get(ownerUserId);

    return {
      id: item.id,
      amount: Number(item.amount),
      description: item.description || '',
      type: item.type,
      category: item.category || 'TABUNGAN',
      is_settled: item.is_settled || false,
      created_at: item.created_at,
      user_id: item.user_id,
      student_id: item.student_id,
      student: item.students || null,
      teacherEmail: profile?.email || 'Guru / Sekolah',
      teacherSchoolName: profile?.school_name || undefined,
    };
  });

  return {
    transactions: formattedTransactions,
    teachers: teacherProfiles,
  };
}

export default async function AdminTransactionsPage(props: PageProps) {
  const resolvedParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const initialTeacherId = resolvedParams?.userId || 'all';
  const initialStudentId = resolvedParams?.studentId || 'all';
  const initialStudentName = resolvedParams?.studentName || '';
  const { transactions, teachers } = await getAdminTransactionsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Daftar Transaksi Siswa
        </h1>
        <p className="text-muted-foreground text-sm">
          Pusat pemantauan & audit mutasi tabungan santri/siswa seluruh sekolah: periksa aliran setoran, penarikan, belanja kantin, dan lakukan koreksi data bila diperlukan.
        </p>
      </div>

      <AdminTransactionsClient
        initialTransactions={transactions}
        teachers={teachers}
        initialSelectedTeacherId={initialTeacherId}
        initialSelectedStudentId={initialStudentId}
        initialStudentName={initialStudentName}
      />
    </div>
  );
}
