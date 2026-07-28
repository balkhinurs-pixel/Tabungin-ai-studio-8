
'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Loader2, 
  CheckCircle2, 
  User,
  Store,
  Calendar
} from 'lucide-react';
import { getSettledHistoryAction } from '../actions';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';

export default function SettlementHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await getSettledHistoryAction();
        setHistory(data);
      } catch (error) {
        console.error('Failed to fetch settled history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Memuat Riwayat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <History className="h-4 w-4" /> Jurnal Pembayaran Lunas
        </h3>
      </div>

      {history.length > 0 ? (
        <div className="space-y-3">
            {history.map((tx) => (
                <Card key={tx.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white border border-gray-50">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                <Store className="h-6 w-6 text-blue-500" />
                            </div>
                            <div className="flex flex-col">
                                <p className="font-black text-sm text-gray-900 leading-tight uppercase truncate max-w-[120px]">
                                    {tx.merchantName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                                        <Calendar className="h-2.5 w-2.5" />
                                        {format(new Date(tx.date), 'dd MMM yy')}
                                    </div>
                                    <span className="h-1 w-1 rounded-full bg-gray-200" />
                                    <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                                        <User className="h-2.5 w-2.5" />
                                        {tx.studentName}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-blue-600 text-base">
                                Rp {tx.amount.toLocaleString('id-ID')}
                            </p>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[7px] font-black uppercase tracking-widest mt-1">
                                <CheckCircle2 className="h-2 w-2" /> TERBAYAR
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <p className="text-center text-[9px] text-muted-foreground font-medium py-4">Menampilkan 50 transaksi terakhir yang sudah dicairkan.</p>
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-[3rem] border-gray-100 bg-gray-50/50">
          <History className="h-12 w-12 mx-auto text-gray-200 mb-4 opacity-30" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Belum Ada Riwayat</p>
          <p className="text-[10px] text-gray-400 font-medium">Transaksi yang sudah dicairkan akan muncul di sini.</p>
        </div>
      )}
    </div>
  );
}
