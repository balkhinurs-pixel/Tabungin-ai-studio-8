'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  TrendingUp, 
  ArrowLeft,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase';
import { format, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getCantineTransactionsAction } from '../actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export default function CantineHistoryPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [merchantName, setMerchantName] = useState('');
  
  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [unsettledOnly, setUnsettledOnly] = useState(false);

  const { toast } = useToast();

  const loadHistory = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!merchantName) {
            const { data: profile } = await supabase.from('profiles').select('school_name').eq('id', user.id).single();
            setMerchantName(profile?.school_name || user.email?.split('@')[0].toUpperCase() || 'KANTIN');
        }

        const data = await getCantineTransactionsAction({
            dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
            dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
            unsettledOnly
        });
        
        if (data) setTransactions(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [dateFrom, dateTo, unsettledOnly]);

  const handlePrintReport = () => {
    if (transactions.length === 0) return;
    setPrinting(true);
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN PENJUALAN MERCHANT', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Outlet: ${merchantName}`, 14, 30);
        doc.text(`Periode: ${dateFrom ? format(dateFrom, 'dd/MM/yy') : '-'} s/d ${dateTo ? format(dateTo, 'dd/MM/yy') : '-'}`, 14, 35);
        doc.text(`Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 14, 40);

        const totalOmzet = transactions.reduce((acc, curr) => acc + curr.amount, 0);
        const totalUnsettled = transactions.filter(tx => !tx.is_settled).reduce((acc, curr) => acc + curr.amount, 0);

        autoTable(doc, {
            startY: 50,
            head: [['TANGGAL', 'NAMA SISWA', 'KELAS', 'STATUS', 'NOMINAL (RP)']],
            body: transactions.map(tx => [
                format(new Date(tx.created_at), 'dd/MM/yy HH:mm'),
                tx.students?.name || 'Siswa',
                tx.students?.class || '-',
                tx.is_settled ? 'LUNAS' : 'BELUM CAIR',
                { content: tx.amount.toLocaleString('id-ID'), styles: { halign: 'right' } }
            ]),
            foot: [
                [{ content: 'RINGKASAN TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, 
                 { content: totalOmzet.toLocaleString('id-ID'), styles: { fontStyle: 'bold', halign: 'right' } }],
                [{ content: 'TOTAL BELUM CAIR (PIUTANG)', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', textColor: [180, 0, 0] } }, 
                 { content: totalUnsettled.toLocaleString('id-ID'), styles: { fontStyle: 'bold', halign: 'right', textColor: [180, 0, 0] } }]
            ],
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22] }
        });

        doc.save(`laporan-penjualan-${merchantName.toLowerCase()}.pdf`);
        toast({ title: "Laporan PDF Berhasil Diunduh" });
    } catch (error) {
        toast({ title: "Gagal membuat laporan", variant: "destructive" });
    } finally {
        setPrinting(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.students?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.students?.nis?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full bg-gray-50" asChild>
                <Link href="/cantine/outlet"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h2 className="text-xl font-black tracking-tight">Riwayat Penjualan</h2>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full border-orange-200 text-orange-600 font-bold text-xs h-9"
            onClick={handlePrintReport}
            disabled={loading || transactions.length === 0 || printing}
        >
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} CETAK PDF
        </Button>
      </div>

      {/* Modern Filter Bar */}
      <Card className="border-none shadow-sm rounded-3xl bg-gray-50/50">
        <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 h-12 rounded-2xl bg-white border-gray-100 text-xs font-bold justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                            {dateFrom ? format(dateFrom, 'dd MMM') : 'Dari'} - {dateTo ? format(dateTo, 'dd MMM') : 'Sampai'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b text-xs font-black uppercase tracking-widest text-gray-400">Pilih Rentang Waktu</div>
                        <div className="flex flex-col sm:flex-row">
                            <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                                locale={id}
                            />
                            <div className="border-l border-gray-100 hidden sm:block" />
                            <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                                locale={id}
                            />
                        </div>
                        <div className="p-3 bg-gray-50 flex justify-between gap-2">
                             <Button variant="ghost" size="sm" className="text-[10px] font-bold" onClick={() => { setDateFrom(startOfDay(new Date())); setDateTo(new Date()); }}>HARI INI</Button>
                             <Button variant="ghost" size="sm" className="text-[10px] font-bold" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>SEMUA</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button 
                    variant={unsettledOnly ? 'default' : 'outline'}
                    className={cn(
                        "h-12 rounded-2xl text-[10px] font-black px-4 transition-all",
                        unsettledOnly ? "bg-orange-600 shadow-lg shadow-orange-100" : "bg-white border-gray-100"
                    )}
                    onClick={() => setUnsettledOnly(!unsettledOnly)}
                >
                    <Filter className="mr-1.5 h-3 w-3" /> {unsettledOnly ? 'PIUTANG SAJA' : 'SEMUA STATUS'}
                </Button>
            </div>

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Cari nama atau NIS siswa..." 
                    className="pl-11 h-12 rounded-2xl border-gray-100 bg-white focus:bg-white focus:ring-primary/20 transition-all text-sm font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
            <div className="py-20 text-center animate-pulse space-y-4">
                <div className="h-20 w-full bg-gray-50 rounded-[2rem]" />
                <div className="h-20 w-full bg-gray-50 rounded-[2rem]" />
                <div className="h-20 w-full bg-gray-50 rounded-[2rem]" />
            </div>
        ) : filteredTransactions.length > 0 ? (
            <>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">
                    Menampilkan {filteredTransactions.length} Transaksi
                </p>
                {filteredTransactions.map((tx) => (
                    <Card key={tx.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden group active:scale-[0.98] transition-all bg-white border border-gray-50">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center border",
                                    tx.is_settled ? "bg-blue-50 border-blue-100" : "bg-emerald-50 border-emerald-100"
                                )}>
                                    <TrendingUp className={cn("h-6 w-6", tx.is_settled ? "text-blue-500" : "text-emerald-500")} />
                                </div>
                                <div className="flex flex-col">
                                    <p className="font-black text-gray-900 leading-tight">
                                        {tx.students?.name || 'Siswa'}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                        <span>{format(new Date(tx.created_at), 'dd MMM • HH:mm', { locale: id })}</span>
                                        <span className="h-1 w-1 rounded-full bg-gray-200" />
                                        <span>{tx.students?.class || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-emerald-600 text-lg">
                                    +{tx.amount.toLocaleString('id-ID')}
                                </p>
                                <div className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest mt-1",
                                    tx.is_settled ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    {tx.is_settled ? <CheckCircle2 className="h-2 w-2" /> : <AlertCircle className="h-2 w-2" />}
                                    {tx.is_settled ? 'Sudah Cair' : 'Belum Cair'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </>
        ) : (
            <div className="py-24 text-center text-muted-foreground space-y-4 border-2 border-dashed border-gray-100 rounded-[3rem]">
                <History className="h-14 w-14 mx-auto opacity-10" />
                <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-300">Data Tidak Ditemukan</p>
                    <p className="text-xs font-medium text-gray-400">Coba ubah rentang tanggal atau filter status.</p>
                </div>
                <Button variant="link" className="text-xs font-bold text-primary" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setUnsettledOnly(false); }}>Lihat Semua Riwayat</Button>
            </div>
        )}
      </div>
    </div>
  );
}
