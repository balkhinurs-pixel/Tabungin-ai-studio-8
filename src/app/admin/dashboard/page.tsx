export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Key, Receipt, ArrowRight, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getStats() {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Profiles
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, plan, role')
        .not('email', 'like', '%.supabase.user');

    if (error) {
        console.error("Error fetching stats:", error);
        return { 
          totalUsers: 0, 
          proUsers: 0, 
          totalTransactions: 0, 
          totalIncome: 0, 
          totalExpense: 0 
        };
    }

    const totalUsers = profiles?.length || 0;
    const proUsers = profiles?.filter(p => p.plan === 'PRO').length || 0;

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

    return { 
      totalUsers, 
      proUsers, 
      totalTransactions, 
      totalIncome, 
      totalExpense 
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
              Pantau seluruh akun sekolah/guru, kuota, aktivasi kode, dan seluruh mutasi transaksi santri.
            </p>
          </div>
          <Button asChild className="gap-2 shadow-sm font-bold">
            <Link href="/admin/transactions">
              <Receipt className="h-4 w-4" />
              Pantau & Edit Transaksi
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
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
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border shadow-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Pantau & Koreksi Transaksi Guru</h3>
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
    </div>
  )
}
