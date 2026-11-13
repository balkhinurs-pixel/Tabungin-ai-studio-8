export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Key, Receipt, ArrowRight, TrendingUp, TrendingDown, ShieldCheck, Wallet, GraduationCap } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface DashboardRecentTransaction {
  id: string;
  amount: number;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string;
  description: string;
  created_at: string;
  student?: {
    id: string;
    name: string;
    nis: string;
    class: string;
    user_id: string;
  } | null;
  school_name: string;
}

async function getStats() {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Profiles
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, plan, role, school_name, email')
        .not('email', 'like', '%.supabase.user');

    if (error) {
        console.error("Error fetching stats:", error);
        return { 
          totalUsers: 0, 
          proUsers: 0, 
          totalTransactions: 0, 
          totalIncome: 0, 
          totalExpense: 0,
          totalStudents: 0,
          netBalance: 0,
          recentTransactions: [] as DashboardRecentTransaction[],
        };
    }

    const totalUsers = profiles?.length || 0;
    const proUsers = profiles?.filter(p => p.plan === 'PRO').length || 0;

    const profileMap = new Map<string, { school_name?: string; email?: string }>();
    (profiles || []).forEach((p) => {
      profileMap.set(p.id, { school_name: p.school_name, email: p.email });
    });

    // 2. Transactions
    const { data: transactions, error: txError } = await supabaseAdmin
        .from('transactions')
        .select('amount, type');

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransactions = 0;

    if (!txError && transactions) {
        totalTransactions = transactions.length;
        transactions.forEach((tx) => {
            const amt = Number(tx.amount) || 0;
            if (tx.type === 'Pemasukan') totalIncome += amt;
            else totalExpense += amt;
        });
    }

    // 3. Students
    const { count: studentCount } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true });

    const totalStudents = studentCount || 0;
    const netBalance = totalIncome - totalExpense;

    // 4. Recent Student Transactions
    const { data: rawRecentTxs, error: recentError } = await supabaseAdmin
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        category,
        description,
        created_at,
        students (
          id,
          name,
          nis,
          class,
          user_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(8);

    if (recentError) {
      console.error("Error fetching recent transactions:", recentError);
    }

    const recentTransactions: DashboardRecentTransaction[] = (rawRecentTxs || []).map((tx: any) => {
      const studentData = Array.isArray(tx.students) ? tx.students[0] : tx.students;
      const schoolProfile = studentData?.user_id ? profileMap.get(studentData.user_id) : null;
      return {
        id: tx.id,
        amount: Number(tx.amount) || 0,
        type: tx.type,
        category: tx.category || 'Umum',
        description: tx.description || '',
        created_at: tx.created_at,
        student: studentData || null,
        school_name: schoolProfile?.school_name || schoolProfile?.email || 'Umum',
      };
    });

    return { 
      totalUsers, 
      proUsers, 
      totalTransactions, 
      totalIncome, 
      totalExpense,
      totalStudents,
      netBalance,
      recentTransactions,
    };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard Admin Pusat</h1>
            <p className="text-muted-foreground text-sm">
              Pantau seluruh akun sekolah/guru, saldo tabungan siswa, kuota, dan mutasi kas digital.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-2 shadow-sm font-bold">
              <Link href="/admin/students">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Pantau Saldo Siswa
              </Link>
            </Button>
            <Button asChild className="gap-2 shadow-sm font-bold">
              <Link href="/admin/transactions">
                <Receipt className="h-4 w-4" />
                Pantau Transaksi
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold tracking-wide">
                <ShieldCheck className="h-3.5 w-3.5" /> Akses Penuh Super Admin
              </div>
              <h2 className="text-xl md:text-2xl font-black">Pusat Audit Transaksi Seluruh Sekolah</h2>
              <p className="text-sm text-emerald-100 max-w-2xl">
                Admin pusat dapat langsung memeriksa transaksi yang diinput oleh setiap guru, memverifikasi aliran tabungan santri, serta mengoreksi data transaksi bila terjadi kesalahan input.
              </p>
            </div>
            <Button asChild variant="secondary" className="whitespace-nowrap font-bold shadow-md">
              <Link href="/admin/transactions">
                Buka Menu Transaksi Guru
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Sekolah / Guru</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Akun terdaftar di database</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Akun Premium (PRO)</CardTitle>
              <Key className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">{stats.proUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Status aktif lisensi PRO</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Transaksi Santri</CardTitle>
              <Receipt className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-indigo-600">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">Seluruh riwayat transaksi</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Pemasukan Kas</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-emerald-600">{formatCurrency(stats.totalIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1">Akumulasi setoran santri</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border shadow-sm hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Pantau Saldo Siswa</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Lihat sisa saldo tabungan santri/siswa seluruh sekolah, filter berdasarkan akun pengelola atau kelas, serta unduh rekap data.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full justify-between font-bold border-emerald-500/30 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30">
                <Link href="/admin/students">
                  Buka Saldo Siswa <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Pantau & Koreksi Transaksi</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Lihat mutasi kas dari setiap sekolah, cari berdasarkan NIS atau nama santri, serta ubah nominal atau hapus transaksi yang salah input secara langsung.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full justify-between font-bold">
                <Link href="/admin/transactions">
                  Buka Pengawasan Transaksi <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Manajemen Pengguna & Kuota</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Kelola daftar akun guru dan sekolah, atur kuota santri (default / kustom), dan aktifkan lisensi PRO secara manual per akun.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full justify-between font-bold">
                <Link href="/admin/users">
                  Kelola Akun Guru <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Student Transactions Section */}
        <Card className="border shadow-sm overflow-hidden bg-card">
          <CardHeader className="p-5 pb-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Transaksi Siswa Terkini (Lintas Sekolah)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit aktivitas transaksi tabungan santri secara real-time dari seluruh instansi.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5 font-bold shrink-0">
              <Link href="/admin/transactions">
                Lihat Seluruh Transaksi Siswa
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36 text-xs font-bold uppercase tracking-wider">Waktu</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Siswa</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Sekolah / Akun</TableHead>
                  <TableHead className="w-28 text-xs font-bold uppercase tracking-wider">Tipe</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Kategori & Keterangan</TableHead>
                  <TableHead className="w-36 text-right text-xs font-bold uppercase tracking-wider">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      Belum ada transaksi siswa yang tercatat di database.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentTransactions.map((tx) => {
                    const isIncome = tx.type === 'Pemasukan';
                    const txDate = tx.created_at ? new Date(tx.created_at) : new Date();

                    return (
                      <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors text-xs">
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {format(txDate, 'dd/MM/yyyy HH:mm', { locale: idLocale })}
                        </TableCell>
                        <TableCell>
                          {tx.student ? (
                            <Link
                              href={`/admin/transactions?studentId=${tx.student.id}&studentName=${encodeURIComponent(tx.student.name)}`}
                              className="font-bold text-foreground hover:text-primary transition-colors hover:underline block"
                              title="Filter transaksi untuk siswa ini"
                            >
                              {tx.student.name}
                              <span className="text-[11px] font-mono text-muted-foreground ml-1.5 font-normal">
                                ({tx.student.nis || '-'})
                              </span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground italic">Siswa telah dihapus</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-foreground truncate max-w-[180px]" title={tx.school_name}>
                          {tx.school_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 font-bold ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{tx.category || 'Umum'}</span>
                          {tx.description && (
                            <span className="text-muted-foreground text-[11px] block truncate max-w-[220px]">
                              {tx.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black tabular-nums text-sm">
                          <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
    </div>
  )
}
