import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  History,
  ArrowUpFromLine,
  ArrowDownToLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, format } from 'date-fns';
import type { Student, Profile } from '@/types';
import { createClient } from '@/lib/utils/supabase/server';
import SearchStudent from './_components/SearchStudent';
import QuickMenu from './_components/QuickMenu';
import HeroBalanceCard from './_components/HeroBalanceCard';

async function DashboardData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>User not found.</p>;
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, plan, custom_quota')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    return (
      <p className="text-destructive text-center p-4">
        Gagal memuat data: Profil pengguna tidak ditemukan.
      </p>
    );
  }

  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select(
      `id, nis, name, class, transactions (id, type, amount, created_at, description)`
    )
    .eq('user_id', user.id);

  if (studentsError || !studentsData) {
    return <p className="text-destructive">Gagal memuat data siswa.</p>;
  }

  const students = studentsData as Student[];
  const profile = profileData as Profile;

  const totalBalance = students.reduce((total, student) => {
    const studentBalance = (student.transactions || []).reduce((acc, tx) => {
      return acc + (tx.type === 'Pemasukan' ? tx.amount : -tx.amount);
    }, 0);
    return total + studentBalance;
  }, 0);

  const allTransactions = students
    .flatMap((s) =>
      (s.transactions || []).map((tx) => ({
        ...tx,
        studentName: s.name,
        studentId: s.id,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    );

  const recentTransactions = allTransactions.slice(0, 5).map((tx) => ({
    id: tx.id,
    date: format(parseISO(tx.created_at!), 'dd/MM/yy'),
    type: tx.type,
    amount: tx.amount,
    studentId: tx.studentId,
    studentName: tx.studentName,
  }));

  const studentQuota =
    profile.custom_quota || (profile.plan === 'PRO' ? 40 : 5);

  return (
    <>
      <HeroBalanceCard
        totalBalance={totalBalance}
        studentCount={students.length}
        studentQuota={studentQuota}
        plan={profile.plan}
      />

      <SearchStudent />

      <QuickMenu />

      {/* Transaksi Terkini Card */}
      <section className="bg-white rounded-[20px] border border-blue-100/80 shadow-[0_6px_22px_-6px_rgba(30,64,175,0.09)] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
            <History className="h-[18px] w-[18px] text-[#0D6EFD] stroke-[2.2]" />
            <span>Transaksi Terkini</span>
          </h3>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 bg-[#EDF4FF] hover:bg-[#DCEBFF] text-[#0D6EFD] rounded-full px-3 py-1 text-[11.5px] font-bold transition-colors"
          >
            <span>Laporan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div>
            {/* Header Bar */}
            <div className="grid grid-cols-12 items-center bg-[#F1F5F9] rounded-xl px-3.5 py-2 text-[12px] font-semibold text-slate-600">
              <div className="col-span-5">Santri</div>
              <div className="col-span-4 text-center">Jenis</div>
              <div className="col-span-3 text-right">Jumlah</div>
            </div>

            {/* Transaction Rows */}
            <div className="divide-y divide-slate-100 mt-1">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'Pemasukan';
                const initial = tx.studentName.trim().charAt(0).toUpperCase();

                return (
                  <Link
                    key={tx.id}
                    href={`/profiles/${tx.studentId}`}
                    className="grid grid-cols-12 items-center px-1.5 py-3 hover:bg-slate-50/80 rounded-xl transition-colors gap-1"
                  >
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <span className="h-9 w-9 rounded-full bg-[#DCEBFF] text-[#0D6EFD] font-bold text-[13px] flex items-center justify-center shrink-0">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-bold text-slate-900 truncate leading-tight">
                          {tx.studentName}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 leading-tight mt-0.5 tabular-nums">
                          {tx.date}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 flex justify-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap',
                          isIncome
                            ? 'bg-[#E6F8EC] text-[#15803D]'
                            : 'bg-[#FEECEC] text-[#DC2626]'
                        )}
                      >
                        {isIncome ? (
                          <ArrowUpFromLine className="h-3 w-3 shrink-0" />
                        ) : (
                          <ArrowDownToLine className="h-3 w-3 shrink-0" />
                        )}
                        <span>{tx.type}</span>
                      </span>
                    </div>

                    <div
                      className={cn(
                        'col-span-3 text-right font-extrabold text-[13px] sm:text-[14px] tabular-nums whitespace-nowrap',
                        isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      )}
                    >
                      Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <History className="h-10 w-10 mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-xs font-semibold">
              Belum ada transaksi terbaru.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-[176px] sm:h-[216px] rounded-[22px] bg-blue-200/60 animate-pulse" />
      <div className="h-[104px] rounded-[20px] bg-white/80 animate-pulse" />
      <div className="h-[138px] rounded-[20px] bg-white/80 animate-pulse" />
      <div className="h-[220px] rounded-[20px] bg-white/80 animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-5 pb-4">
      <Suspense fallback={<DashboardLoading />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
