
import { Suspense } from 'react';
import Link from 'next/link';
import { Users, QrCode, FileText, ShieldCheck, Search, ArrowRight, EyeOff, Loader2, Banknote, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { parseISO, format } from 'date-fns';
import type { Student, Transaction, Profile } from '@/types';
import { createClient } from '@/lib/utils/supabase/server';
import SearchStudent from './_components/SearchStudent';
import QuickMenu from './_components/QuickMenu';

async function DashboardData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p>User not found.</p>;
  }
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, plan, custom_quota')
    .eq('id', user.id)
    .maybeSingle();
  
  if (profileError || !profileData) {
      return <p className="text-destructive text-center p-4">Gagal memuat data: Profil pengguna tidak ditemukan.</p>;
  }

  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select(`id, nis, name, class, transactions (id, type, amount, created_at, description)`)
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

  const allTransactions = students.flatMap(s => 
    (s.transactions || []).map(tx => ({
      ...tx,
      studentName: s.name,
      studentId: s.id
    }))
  ).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  const recentTransactions = allTransactions.slice(0, 5).map(tx => ({
      id: tx.id,
      date: format(parseISO(tx.created_at!), 'dd/MM/yy'),
      type: tx.type,
      amount: tx.amount,
      studentId: tx.studentId,
      studentName: tx.studentName,
  }));

  const studentQuota = profile.custom_quota || (profile.plan === 'PRO' ? 40 : 5);

  return (
    <>
       <Card className="bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-foreground shadow-xl border-none relative overflow-hidden h-[240px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/4 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />
        
        <CardContent className="p-6 relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <span className="text-3xl font-black tracking-tighter text-white drop-shadow-md">
                  Tabung<span className="opacity-60">.in</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 -mt-1 ml-0.5">Guru Dashboard</span>
            </div>
            {profile.plan === 'TRIAL' ? (
              <Badge variant="secondary" className="bg-amber-400 text-amber-950 hover:bg-amber-400/90 border-none font-bold">TRIAL</Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400/90 border-none font-bold shadow-sm">PRO</Badge>
            )}
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-80 font-semibold tracking-wide uppercase">Total Saldo Terkumpul</span>
              <EyeOff className="h-3 w-3 opacity-60" />
            </div>
            <p className="text-4xl font-black tracking-tight mt-1 drop-shadow-sm">
              {totalBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
            </p>
            
            <div className="mt-4 flex items-center justify-between bg-white/10 border border-white/20 px-4 py-3 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 opacity-70" />
                  <p className="text-xs font-bold tracking-wide">KUOTA SISWA TERPAKAI</p>
                </div>
                <div className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">
                  {students.length} / {studentQuota}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SearchStudent />
      
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
        <CardContent className="p-4">
            <QuickMenu />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
                   <History className="h-4 w-4" /> Transaksi Terkini
                </h3>
                <Button variant="link" className="text-primary h-auto p-0 text-xs font-bold" asChild>
                    <Link href="/reports">
                      Laporan <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </div>
            {recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">SISWA</TableHead>
                                <TableHead className="text-[10px] uppercase font-black tracking-widest text-muted-foreground text-center">JENIS</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-black tracking-widest text-muted-foreground">JUMLAH</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTransactions.map((tx) => (
                                <TableRow key={tx.id} className="group hover:bg-gray-50/50 border-gray-50">
                                    <TableCell>
                                        <Link href={`/profiles/${tx.studentId}`} className="hover:underline block">
                                            <div className="font-bold text-sm text-gray-800">{tx.studentName}</div>
                                            <div className="text-[10px] font-medium text-muted-foreground">{tx.date}</div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={tx.type === 'Pemasukan' ? 'default' : 'destructive'} className={cn("text-[9px] px-2 py-0 border-none font-black", tx.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                            {tx.type.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-black text-sm", tx.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600')}>
                                        {tx.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto text-gray-100 mb-2" />
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Belum ada transaksi.</p>
                </div>
            )}
          </CardContent>
      </Card>
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Card className="bg-primary/10 border-none rounded-3xl">
        <CardContent className="p-6 h-[240px] animate-pulse" />
      </Card>
      <div className="h-14 bg-muted animate-pulse rounded-2xl" />
      <div className="h-24 bg-muted animate-pulse rounded-3xl" />
      <div className="h-64 bg-muted animate-pulse rounded-3xl" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-10">
      <Suspense fallback={<DashboardLoading />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
