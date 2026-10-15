export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { Profile } from '@/types';
import StudentBalancesClient, { AdminStudentBalanceItem } from './StudentBalancesClient';

interface PageProps {
  searchParams?: {
    userId?: string;
  } | Promise<{ userId?: string }>;
}

async function getAdminStudentBalancesData() {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Fetch registered profiles (Guru & Sekolah)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, school_name, school_code, role, plan')
    .not('email', 'like', '%.supabase.user')
    .order('school_name', { ascending: true });

  if (profilesError) {
    console.error('Error fetching profiles in admin students:', profilesError);
  }

  const teacherProfiles = (profiles || []) as Profile[];
  const profileMap = new Map<string, Profile>();
  teacherProfiles.forEach((p) => {
    profileMap.set(p.id, p);
  });

  // 2. Fetch all students joined with transactions for balance computation
  const { data: rawStudents, error: studentsError } = await supabaseAdmin
    .from('students')
    .select(`
      id,
      nis,
      name,
      class,
      user_id,
      created_at,
      transactions (
        id,
        type,
        amount
      )
    `)
    .order('name', { ascending: true });

  if (studentsError) {
    console.error('Error fetching students with transactions in admin:', studentsError);
    return { students: [], teachers: teacherProfiles };
  }

  // 3. Process each student: calculate current balance and aggregate stats
  const formattedStudents: AdminStudentBalanceItem[] = (rawStudents || []).map((s: any) => {
    const profile = profileMap.get(s.user_id);
    const txList = s.transactions || [];

    let totalIncome = 0;
    let totalExpense = 0;

    txList.forEach((tx: any) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'Pemasukan') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    });

    const balance = totalIncome - totalExpense;

    return {
      id: s.id,
      nis: s.nis || '',
      name: s.name || 'Tanpa Nama',
      class: s.class || '',
      user_id: s.user_id,
      school_name: profile?.school_name || profile?.email || 'Umum',
      school_email: profile?.email || '',
      balance,
      total_income: totalIncome,
      total_expense: totalExpense,
      transaction_count: txList.length,
    };
  });

  return {
    students: formattedStudents,
    teachers: teacherProfiles,
  };
}

export default async function AdminStudentsPage(props: PageProps) {
  const resolvedParams = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const initialTeacherId = resolvedParams?.userId || 'all';
  const { students, teachers } = await getAdminStudentBalancesData();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Pantau Saldo Siswa
        </h1>
        <p className="text-muted-foreground text-sm">
          Pantau akumulasi sisa saldo tabungan santri/siswa lintas sekolah, filter per pengelola, dan audit mutasi secara terpusat.
        </p>
      </div>

      {/* Main Client Component */}
      <StudentBalancesClient
        initialStudents={students}
        teachers={teachers}
        initialTeacherId={initialTeacherId}
      />
    </div>
  );
}
