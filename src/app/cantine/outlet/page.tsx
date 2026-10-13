'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, 
  ScanLine, 
  History, 
  TrendingUp, 
  ArrowRight, 
  Loader2, 
  Clock, 
  ChevronRight, 
  Wallet,
  Banknote,
  Boxes,
  AlertTriangle,
  Receipt,
  Store,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCantineTransactionsAction, getCanteenDailySummaryAction } from '../actions';

export default function CantineOutletPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      todaySales: 0,
      todayCash: 0,
      todayTabungan: 0,
      unsettledBalance: 0,
      customerCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      recentTransactions: [] as any[]
  });

  const loadData = async () => {
    setLoading(true);
    const [transactions, dailySummary] = await Promise.all([
      getCantineTransactionsAction(),
      getCanteenDailySummaryAction()
    ]);
    
    if (transactions) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTxs = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
        const totalToday = todayTxs.reduce((acc, tx) => acc + tx.amount, 0);
        const totalCashToday = todayTxs.filter(tx => tx.is_cash).reduce((acc, tx) => acc + tx.amount, 0);
        const totalTabunganToday = todayTxs.filter(tx => !tx.is_cash).reduce((acc, tx) => acc + tx.amount, 0);
        const unsettled = transactions.filter(tx => !tx.is_cash && !tx.is_settled).reduce((acc, tx) => acc + tx.amount, 0);
        const customers = new Set(todayTxs.map(tx => tx.student_id || tx.id)).size;

        setStats({
            todaySales: totalToday,
            todayCash: totalCashToday,
            todayTabungan: totalTabunganToday,
            unsettledBalance: unsettled,
            customerCount: customers,
            lowStockCount: dailySummary.lowStockCount || 0,
            outOfStockCount: dailySummary.outOfStockCount || 0,
            recentTransactions: transactions.slice(0, 10)
        });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
      return (
          <div className="flex h-[70vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header POS Banner */}
      <Card className="bg-gradient-to-br from-orange-500 to-rose-600 border-none rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        <CardContent className="p-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <UtensilsCrossed className="h-40 w-40" />
            </div>
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-white/80 font-black text-[10px] uppercase tracking-[0.3em]">Outlet Kantin POS</span>
                    </div>
                    <span className="text-white/90 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                        {stats.customerCount} Pembeli Hari Ini
                    </span>
                </div>
                
                <div className="space-y-1">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Total Omzet Penjualan Hari Ini</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        {stats.todaySales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                    </h2>
                </div>

                {/* Sub-Ringkasan Kas Tunai vs Tabungan Santri */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/10">
                        <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-bold uppercase tracking-wider mb-1">
                            <Banknote className="h-3.5 w-3.5 text-emerald-300" /> Cash di Laci Kasir
                        </div>
                        <p className="text-white font-black text-lg">
                            Rp {stats.todayCash.toLocaleString('id-ID')}
                        </p>
                        <p className="text-white/60 text-[8px] font-medium mt-0.5">Uang fisik langsung di kasir</p>
                    </div>

                    <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-md border border-white/10">
                        <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-bold uppercase tracking-wider mb-1">
                            <Wallet className="h-3.5 w-3.5 text-blue-300" /> Tabungan / ATM
                        </div>
                        <p className="text-white font-black text-lg">
                            Rp {stats.todayTabungan.toLocaleString('id-ID')}
                        </p>
                        <p className="text-white/60 text-[8px] font-medium mt-0.5">Dipotong tabungan santri</p>
                    </div>
                </div>

                {/* Piutang Menunggu Cair */}
                <div className="bg-black/20 p-3.5 rounded-2xl backdrop-blur-md border border-white/10 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Piutang Menunggu Pencairan Sekolah</p>
                        <p className="text-white font-black text-xl">
                            {stats.unsettledBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <Link href="/cantine/history" className="text-white/90 text-xs font-bold hover:underline flex items-center gap-1">
                        Rincian <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Warning Alert Jika Ada Stok Menipis atau Habis */}
      {(stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
        <Card className="border border-amber-200 bg-amber-50/80 rounded-3xl overflow-hidden shadow-sm">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-900">Perhatian Stok Menu Kantin</p>
                <p className="text-[10px] font-medium text-amber-700">
                  {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} produk habis. ` : ''}
                  {stats.lowStockCount > 0 ? `${stats.lowStockCount} produk stok menipis (≤5 pcs).` : ''}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-bold text-xs h-8" asChild>
              <Link href="/cantine/menu">Kelola Stok</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button asChild size="lg" className="h-20 rounded-[2rem] bg-black hover:bg-gray-800 text-white font-black text-base shadow-xl flex items-center justify-center gap-3">
              <Link href="/cantine/payment">
                  <ScanLine className="h-6 w-6 text-white" /> TERIMA PEMBAYARAN (POS)
              </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-20 rounded-[2rem] border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm shadow-sm flex items-center justify-center gap-2">
              <Link href="/cantine/menu">
                  <Boxes className="h-5 w-5 text-gray-700" /> KATALOG & MANAJEMEN STOK
              </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-20 rounded-[2rem] border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-black text-sm shadow-sm flex items-center justify-center gap-2">
              <Link href="/cantine/history">
                  <Receipt className="h-5 w-5 text-gray-700" /> LAPORAN & CETAK (HITAM)
              </Link>
          </Button>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Transaksi Terakhir</h3>
              <Button variant="link" size="sm" className="text-black font-bold text-xs p-0 h-auto" asChild>
                  <Link href="/cantine/history">Lihat Semua Riwayat <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
          </div>

          {stats.recentTransactions.length > 0 ? (
              <div className="space-y-2.5">
                  {stats.recentTransactions.map((tx: any) => {
                      const isCash = tx.is_cash;
                      const customerName = isCash
                          ? (tx.description?.split(':')[0]?.replace('Tunai [', '').replace(']', '') || 'Pembeli Tunai')
                          : (tx.students?.name || 'Siswa');

                      return (
                          <div key={tx.id} className="flex items-center justify-between p-4 rounded-3xl bg-white border border-gray-200 shadow-sm transition-all hover:border-gray-400">
                              <div className="flex items-center gap-3">
                                  <div className={cn(
                                      "h-10 w-10 rounded-2xl flex items-center justify-center border",
                                      isCash 
                                        ? "bg-emerald-100 border-emerald-300 text-emerald-700" 
                                        : "bg-blue-100 border-blue-300 text-blue-700"
                                  )}>
                                      {isCash ? <Banknote className="h-5 w-5 text-emerald-700" /> : <Wallet className="h-5 w-5 text-blue-700" />}
                                  </div>
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                          <p className="font-black text-sm text-black leading-tight">
                                              {customerName}
                                          </p>
                                          <span className={cn(
                                            "text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs",
                                            isCash 
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                                              : "bg-blue-100 text-blue-800 border-blue-300"
                                          )}>
                                            {isCash ? 'CASH' : 'ATM'}
                                          </span>
                                      </div>
                                      <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                                          {format(new Date(tx.created_at), 'dd MMM • HH:mm', { locale: id })} {!isCash && tx.students?.class ? `• Kelas ${tx.students.class}` : ''}
                                      </p>
                                  </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-black text-base font-mono">
                                    Rp {tx.amount.toLocaleString('id-ID')}
                                </p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-gray-500">
                                    {isCash ? "Lunas di Laci" : (tx.is_settled ? "Sudah Cair" : "Piutang")}
                                </p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50">
                  <History className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Belum ada transaksi penjualan hari ini</p>
              </div>
          )}
      </div>
    </div>
  );
}
