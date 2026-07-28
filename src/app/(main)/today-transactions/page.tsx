
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  ArrowLeft, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2, 
  Wallet,
  UtensilsCrossed,
  MonitorSmartphone,
  Info,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldEllipsis,
  Download,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TodayTransactionsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });

  const fetchTransactions = async (date: Date) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            students!inner (
                id, name, class, nis, user_id
            )
        `)
        .eq('students.user_id', user.id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
    } else {
        const txs = data as Transaction[];
        setTransactions(txs);
        
        const stats = txs.reduce((acc, curr) => {
            if (curr.type === 'Pemasukan') acc.income += curr.amount;
            else acc.expense += curr.amount;
            return acc;
        }, { income: 0, expense: 0 });
        
        setTotals(stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleGoToToday = () => setSelectedDate(new Date());

  const handleDownloadPdf = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Transaksi',
        description: 'Tidak ada data transaksi yang dapat dicetak pada tanggal ini.',
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const formattedDate = format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id });
      const netTotal = totals.income - totals.expense;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN JURNAL TRANSAKSI', 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal: ${formattedDate}`, 105, 22, { align: 'center' });

      const tableBody = transactions.map((tx, index) => [
        index + 1,
        format(new Date(tx.created_at!), 'HH:mm'),
        tx.students?.name || 'Siswa',
        getCategoryLabel(tx.category),
        tx.type,
        tx.description || '-',
        {
          content: `${tx.type === 'Pemasukan' ? '+' : '-'} Rp ${tx.amount.toLocaleString('id-ID')}`,
          styles: {
            halign: 'right' as const,
            textColor: (tx.type === 'Pemasukan' ? [16, 185, 129] : [225, 29, 72]) as [number, number, number],
            fontStyle: 'bold' as const,
          },
        },
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['NO', 'WAKTU', 'NAMA TRANSAKSI', 'KATEGORI', 'JENIS', 'KETERANGAN', 'JUMLAH']],
        body: tableBody as any,
        foot: [
          [
            { content: 'Total Setoran (Pemasukan)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rp ${totals.income.toLocaleString('id-ID')}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] as [number, number, number] } },
          ],
          [
            { content: 'Total Penarikan (Pengeluaran)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `Rp ${totals.expense.toLocaleString('id-ID')}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] as [number, number, number] } },
          ],
          [
            { content: 'Total Akhir (Selisih Net)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } },
            {
              content: `${netTotal < 0 ? '- ' : ''}Rp ${Math.abs(netTotal).toLocaleString('id-ID')}`,
              styles: {
                halign: 'right',
                fontStyle: 'bold',
                textColor: (netTotal >= 0 ? [37, 99, 235] : [180, 83, 9]) as [number, number, number],
              },
            },
          ],
        ],
        headStyles: { fillColor: [29, 78, 133], textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 38 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 44 },
          6: { cellWidth: 38 },
        },
      });

      doc.save(`jurnal-transaksi-${format(selectedDate, 'yyyyMMdd')}.pdf`);
      toast({
        title: 'PDF Berhasil Diunduh',
        description: `Laporan jurnal transaksi ${format(selectedDate, 'dd/MM/yyyy')} telah dibuat.`,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat PDF',
        description: 'Terjadi kesalahan saat memproses laporan PDF.',
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'BELANJA_KANTIN': return <UtensilsCrossed className="h-3 w-3" />;
        case 'TARIK_TUNAI': return <MonitorSmartphone className="h-3 w-3" />;
        case 'BIAYA_ADMIN': return <ShieldEllipsis className="h-3 w-3" />;
        default: return <Wallet className="h-3 w-3" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
        case 'BELANJA_KANTIN': return 'Kantin';
        case 'TARIK_TUNAI': return 'ATM Kios';
        case 'BIAYA_ADMIN': return 'Admin';
        default: return 'Tabungan';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Date Picker */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" asChild className="rounded-full shrink-0">
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Jurnal Transaksi</h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Riwayat Harian Siswa</p>
                </div>
            </div>
            <Button 
                onClick={handleDownloadPdf}
                disabled={loading || transactions.length === 0}
                className="bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs h-10 px-4 shadow-sm gap-2 shrink-0"
            >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Laporan PDF</span>
                <span className="sm:hidden">PDF</span>
            </Button>
        </div>

        <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="rounded-xl h-10 w-10">
                <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="flex-1 h-10 gap-2 font-bold text-sm">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        locale={id}
                    />
                    <div className="p-3 border-t bg-gray-50">
                        <Button variant="outline" size="sm" className="w-full font-bold text-xs h-8" onClick={handleGoToToday}>
                            Kembali ke Hari Ini
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextDay} 
                className="rounded-xl h-10 w-10"
                disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
      </div>

      {(() => {
        const netTotal = totals.income - totals.expense;
        return (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Card className="bg-emerald-50 border-emerald-100 shadow-none rounded-2xl">
                  <CardContent className="p-3 sm:p-4">
                      <p className="text-[8px] sm:text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1 truncate">Total Setoran</p>
                      <p className="text-xs sm:text-lg font-black text-emerald-600 truncate">
                          {totals.income.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                      </p>
                  </CardContent>
              </Card>
              <Card className="bg-rose-50 border-rose-100 shadow-none rounded-2xl">
                  <CardContent className="p-3 sm:p-4">
                      <p className="text-[8px] sm:text-[9px] font-black text-rose-700 uppercase tracking-widest mb-1 truncate">Total Penarikan</p>
                      <p className="text-xs sm:text-lg font-black text-rose-600 truncate">
                          {totals.expense.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                      </p>
                  </CardContent>
              </Card>
              <Card className={cn(
                  "shadow-none rounded-2xl border",
                  netTotal >= 0 
                      ? "bg-blue-50 border-blue-100" 
                      : "bg-amber-50 border-amber-200"
              )}>
                  <CardContent className="p-3 sm:p-4">
                      <p className={cn(
                          "text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 truncate",
                          netTotal >= 0 ? "text-blue-700" : "text-amber-800"
                      )}>
                          Total Akhir
                      </p>
                      <p className={cn(
                          "text-xs sm:text-lg font-black truncate",
                          netTotal >= 0 ? "text-blue-600" : "text-amber-700"
                      )}>
                          {netTotal < 0 
                              ? `- ${Math.abs(netTotal).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}`
                              : netTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                          }
                      </p>
                  </CardContent>
              </Card>
          </div>
        );
      })()}

      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Rincian Aktivitas
                  </CardTitle>
                  <CardDescription className="text-[10px]">Menampilkan data pada tanggal yang dipilih.</CardDescription>
              </div>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={loading || transactions.length === 0}
                  className="rounded-xl text-xs font-bold gap-1.5 h-8 border-primary/20 text-primary hover:bg-primary/5"
              >
                  <Download className="h-3.5 w-3.5" /> Cetak PDF
              </Button>
          </CardHeader>
          <CardContent className="px-2">
              {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sinkronisasi data...</p>
                  </div>
              ) : transactions.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                      {transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-4 px-3 hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className={cn(
                                      "h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                                      tx.type === 'Pemasukan' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                  )}>
                                      {tx.type === 'Pemasukan' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                                  </div>
                                  <div className="flex flex-col">
                                      <p className="font-bold text-sm text-gray-900 leading-none mb-1">
                                          {tx.students?.name}
                                      </p>
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-gray-400">{format(new Date(tx.created_at!), 'HH:mm')}</span>
                                          <span className="h-1 w-1 rounded-full bg-gray-200" />
                                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">
                                              {getCategoryIcon(tx.category)}
                                              {getCategoryLabel(tx.category)}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className={cn(
                                      "font-black text-sm",
                                      tx.type === 'Pemasukan' ? "text-emerald-600" : "text-rose-600"
                                  )}>
                                      {tx.type === 'Pemasukan' ? '+' : '-'} {tx.amount.toLocaleString('id-ID')}
                                  </p>
                                  <p className="text-[8px] font-medium text-gray-400 truncate max-w-[80px]">
                                      {tx.description}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="py-20 text-center space-y-3">
                      <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                          <History className="h-8 w-8 text-gray-200" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tidak ada transaksi pada tanggal ini</p>
                  </div>
              )}
          </CardContent>
      </Card>
      
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0" />
          <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
              Data ini mencakup semua aktivitas dari <strong>Kantin</strong>, <strong>ATM Kios</strong>, dan setoran langsung. Gunakan pemilih tanggal di atas untuk memeriksa laporan hari sebelumnya.
          </p>
      </div>
    </div>
  );
}
