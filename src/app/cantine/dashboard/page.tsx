
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
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CantineDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      todaySales: 0,
      customerCount: 0,
      recentTransactions: [] as any[]
  });

  useEffect(() => {
    const fetchCantineData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: transactions } = await supabase
            .from('transactions')
            .select(`*, students(name, class)`)
            .eq('user_id', user.id)
            .eq('category', 'BELANJA_KANTIN')
            .order('created_at', { ascending: false });

        if (transactions) {
            const todayTxs = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
            const total = todayTxs.reduce((acc, tx) => acc + tx.amount, 0);
            const customers = new Set(todayTxs.map(tx => tx.student_id)).size;

            setStats({
                todaySales: total,
                customerCount: customers,
                recentTransactions: transactions.slice(0, 5)
            });
        }
        setLoading(false);
    };
    fetchCantineData();
  }, [supabase]);

  if (loading) {
      return (
          <div className="flex h-[70vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <Card className="bg-gradient-to-br from-orange-500 to-rose-600 border-none rounded-3xl overflow-hidden shadow-xl">
        <CardContent className="p-8 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <UtensilsCrossed className="h-40 w-40" />
            </div>
            <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <UtensilsCrossed className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-white/80 font-black text-[10px] uppercase tracking-[0.3em]">Outlet Kantin</span>
                </div>
                
                <div className="space-y-1">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Penjualan Hari Ini</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">
                        {stats.todaySales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                    </h2>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                        <p className="text-[10px] text-white/60 font-bold uppercase">Pelanggan</p>
                        <p className="text-white font-black">{stats.customerCount}</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                        <p className="text-[10px] text-white/60 font-bold uppercase">Status</p>
                        <p className="text-white font-black">BUKA</p>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
          <Button asChild size="lg" className="h-20 rounded-3xl bg-primary hover:bg-primary/90 text-lg font-black shadow-lg shadow-primary/20">
              <Link href="/cantine/payment">
                  <ScanLine className="mr-3 h-6 w-6" /> TERIMA PEMBAYARAN
              </Link>
          </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl">
          <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Riwayat Terakhir
                  </h3>
                  <Button variant="ghost" size="sm" className="text-primary font-bold text-xs" asChild>
                      <Link href="/cantine/history">Lihat Semua <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
              </div>

              {stats.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                      {stats.recentTransactions.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                              <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm text-gray-900">{tx.students?.name || 'Siswa (Butuh Izin SQL)'}</p>
                                      <p className="text-[10px] text-gray-500 font-medium">
                                          {format(new Date(tx.created_at), 'HH:mm', { locale: id })} • Kelas {tx.students?.class || '-'}
                                      </p>
                                  </div>
                              </div>
                              <p className="font-black text-emerald-600">
                                  +{tx.amount.toLocaleString('id-ID')}
                              </p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="py-10 text-center text-muted-foreground space-y-2">
                      <History className="h-10 w-10 mx-auto opacity-20" />
                      <p className="text-xs font-medium">Belum ada transaksi hari ini.</p>
                  </div>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
