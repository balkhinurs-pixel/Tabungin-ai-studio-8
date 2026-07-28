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
  Wallet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCantineTransactionsAction } from '../actions';

export default function CantineOutletPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      todaySales: 0,
      unsettledBalance: 0,
      customerCount: 0,
      recentTransactions: [] as any[]
  });

  const loadData = async () => {
    setLoading(true);
    const transactions = await getCantineTransactionsAction();
    
    if (transactions) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTxs = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
        const totalToday = todayTxs.reduce((acc, tx) => acc + tx.amount, 0);
        const unsettled = transactions.filter(tx => !tx.is_settled).reduce((acc, tx) => acc + tx.amount, 0);
        const customers = new Set(todayTxs.map(tx => tx.student_id)).size;

        setStats({
            todaySales: totalToday,
            unsettledBalance: unsettled,
            customerCount: customers,
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
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <UtensilsCrossed className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 font-black text-[10px] uppercase tracking-[0.3em]">Outlet POS</span>
                </div>
                
                <div className="space-y-1">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Omzet Hari Ini</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        {stats.todaySales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                    </h2>
                </div>

                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Saldo Belum Cair</p>
                        <p className="text-white font-black text-xl">
                            {stats.unsettledBalance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <Wallet className="h-6 w-6 text-white/40" />
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Main Call to Action */}
      <div className="grid grid-cols-1 gap-4">
          <Button asChild size="lg" className="h-24 rounded-[2rem] bg-primary hover:bg-primary/90 text-xl font-black shadow-xl shadow-primary/20 border-b-8 border-primary-foreground/20 active:translate-y-1 active:border-b-0 transition-all">
              <Link href="/cantine/payment">
                  <ScanLine className="mr-3 h-7 w-7" /> TERIMA PEMBAYARAN
              </Link>
          </Button>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Riwayat Terakhir</h3>
              <Button variant="link" size="sm" className="text-primary font-bold text-xs p-0 h-auto" asChild>
                  <Link href="/cantine/history">Lihat Semua <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
          </div>

          {stats.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                  {stats.recentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-5 rounded-3xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform">
                          <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                              </div>
                              <div className="flex flex-col">
                                  <p className="font-black text-sm text-gray-900 leading-tight">
                                      {tx.students?.name || 'Siswa'}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                      {format(new Date(tx.created_at), 'HH:mm', { locale: id })} • Kelas {tx.students?.class || '-'}
                                  </p>
                              </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-600 text-lg">
                                +{tx.amount.toLocaleString('id-ID')}
                            </p>
                            <p className={cn(
                                "text-[7px] font-black uppercase tracking-widest",
                                tx.is_settled ? "text-blue-500" : "text-amber-500"
                            )}>
                                {tx.is_settled ? "Sudah Cair" : "Belum Cair"}
                            </p>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                  <History className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Belum ada penjualan hari ini</p>
              </div>
          )}
      </div>
    </div>
  );
}
