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
  AlertCircle,
  Banknote,
  Wallet,
  Receipt,
  Store
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
  const [paymentMethod, setPaymentMethod] = useState<'ALL' | 'CASH' | 'TABUNGAN'>('ALL');

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
            unsettledOnly,
            paymentMethod
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
  }, [dateFrom, dateTo, unsettledOnly, paymentMethod]);

  // Financial calculations
  const totalOmzet = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCash = transactions.filter(tx => tx.is_cash).reduce((acc, curr) => acc + curr.amount, 0);
  const totalTabungan = transactions.filter(tx => !tx.is_cash).reduce((acc, curr) => acc + curr.amount, 0);
  const totalUnsettled = transactions.filter(tx => !tx.is_cash && !tx.is_settled).reduce((acc, curr) => acc + curr.amount, 0);
  const totalSettled = transactions.filter(tx => !tx.is_cash && tx.is_settled).reduce((acc, curr) => acc + curr.amount, 0);

  // Print PDF in Crisp High-Contrast Pure Black (Khusus cetak jelas & hitam pekat)
  const handlePrintReport = () => {
    if (transactions.length === 0) return;
    setPrinting(true);
    
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header Title in Solid Black
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('LAPORAN PENJUALAN KANTIN / OUTLET', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Outlet: ${merchantName}`, 14, 26);
        doc.text(`Periode: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Semua'} s/d ${dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Semua'}`, 14, 31);
        doc.text(`Dicetak Pada: ${format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: id })}`, 14, 36);

        // Garis Pembatas Hitam
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(14, 40, pageWidth - 14, 40);

        autoTable(doc, {
            startY: 45,
            head: [['NO', 'TANGGAL', 'PELANGGAN / SISWA', 'METODE', 'DETAIL BARANG', 'STATUS', 'NOMINAL (RP)']],
            body: transactions.map((tx, idx) => {
                const customer = tx.is_cash 
                    ? (tx.description?.split(':')[0]?.replace('Tunai [', '').replace(']', '') || 'Pembeli Tunai')
                    : `${tx.students?.name || 'Siswa'} (${tx.students?.class || '-'})`;
                
                const method = tx.is_cash ? 'CASH / TUNAI' : 'TABUNGAN (ATM)';
                const status = tx.is_cash ? 'DITERIMA (LACI)' : (tx.is_settled ? 'LUNAS (CAIR)' : 'BELUM CAIR');
                const itemsDetail = tx.description?.includes(':') ? tx.description.split(':')[1]?.trim() : '-';

                return [
                    idx + 1,
                    format(new Date(tx.created_at), 'dd/MM/yy HH:mm'),
                    customer,
                    method,
                    itemsDetail,
                    status,
                    { content: tx.amount.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } }
                ];
            }),
            foot: [
                [
                  { content: 'TOTAL KESELURUHAN (TOTAL OMZET)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 10 } }, 
                  { content: `Rp ${totalOmzet.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 10 } }
                ],
                [
                  { content: 'TOTAL UANG KAS TUNAI (LACI KASIR)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }, 
                  { content: `Rp ${totalCash.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }
                ],
                [
                  { content: 'TOTAL NON-TUNAI TABUNGAN (ATM/KAS SEKOLAH)', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }, 
                  { content: `Rp ${totalTabungan.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }
                ],
                [
                  { content: 'TOTAL PIUTANG BELUM DICAIRKAN OLEH SEKOLAH', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }, 
                  { content: `Rp ${totalUnsettled.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0], fontSize: 9 } }
                ]
            ],
            theme: 'grid',
            styles: {
                textColor: [0, 0, 0], // HITAM PEKAT
                fontSize: 8,
                lineColor: [0, 0, 0], // GARIS HITAM JELAS
                lineWidth: 0.2
            },
            headStyles: { 
                fillColor: [235, 235, 235], // Background abu-abu terang agar teks hitam terbaca jelas
                textColor: [0, 0, 0], // HITAM PEKAT
                fontStyle: 'bold',
                lineColor: [0, 0, 0],
                lineWidth: 0.3
            },
            footStyles: { 
                fillColor: [245, 245, 245], 
                textColor: [0, 0, 0], // HITAM PEKAT KHUSUS TOTAL
                fontStyle: 'bold', 
                fontSize: 9,
                lineColor: [0, 0, 0],
                lineWidth: 0.3
            }
        });

        doc.save(`laporan-kantin-${merchantName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
        toast({ title: "Laporan PDF Berhasil Diunduh (Format Hitam Jelas)" });
    } catch (error) {
        console.error('Error generating PDF:', error);
        toast({ title: "Gagal membuat laporan", variant: "destructive" });
    } finally {
        setPrinting(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const q = searchTerm.toLowerCase();
    const studentName = tx.students?.name?.toLowerCase() || '';
    const studentNis = tx.students?.nis || '';
    const desc = tx.description?.toLowerCase() || '';
    return studentName.includes(q) || studentNis.includes(q) || desc.includes(q);
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full bg-gray-100 hover:bg-gray-200" asChild>
                <Link href="/cantine/outlet"><ArrowLeft className="h-5 w-5 text-gray-800" /></Link>
            </Button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-900">Riwayat & Laporan Penjualan</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{merchantName}</p>
            </div>
        </div>
        <Button 
            variant="default" 
            size="sm" 
            className="rounded-full bg-black hover:bg-gray-800 text-white font-black text-xs h-10 px-4 shadow-sm"
            onClick={handlePrintReport}
            disabled={loading || transactions.length === 0 || printing}
        >
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} CETAK PDF (HITAM)
        </Button>
      </div>

      {/* Ringkasan Finansial Rekonsiliasi (Hitam & Kontras Tinggi) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Omzet */}
        <Card className="rounded-3xl border-2 border-black bg-white shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-700">Total Omzet</span>
              <Receipt className="h-4 w-4 text-black" />
            </div>
            <p className="text-xl font-black text-black">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-gray-600 font-bold">Semua transaksi penjualan</p>
          </CardContent>
        </Card>

        {/* Uang Cash Fisik (Laci Kasir) */}
        <Card className="rounded-3xl border border-gray-300 bg-gray-50 shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-black">Cash di Laci Kasir</span>
              <Banknote className="h-4 w-4 text-black" />
            </div>
            <p className="text-xl font-black text-black">
              Rp {totalCash.toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-gray-600 font-bold">Uang tunai fisik langsung di kantin</p>
          </CardContent>
        </Card>

        {/* Tabungan Santri (ATM) */}
        <Card className="rounded-3xl border border-gray-300 bg-gray-50 shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-black">Tabungan Santri (ATM)</span>
              <Wallet className="h-4 w-4 text-black" />
            </div>
            <p className="text-xl font-black text-black">
              Rp {totalTabungan.toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-gray-600 font-bold">Dipotong dari saldo tabungan santri</p>
          </CardContent>
        </Card>

        {/* Piutang Belum Cair */}
        <Card className="rounded-3xl border border-gray-300 bg-gray-50 shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-black">Piutang Belum Cair</span>
              <AlertCircle className="h-4 w-4 text-black" />
            </div>
            <p className="text-xl font-black text-black">
              Rp {totalUnsettled.toLocaleString('id-ID')}
            </p>
            <p className="text-[9px] text-gray-600 font-bold">Menunggu pencairan dari sekolah</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar: Waktu, Status & Metode Pembayaran */}
      <Card className="border border-gray-200 shadow-sm rounded-3xl bg-white">
        <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 h-11 rounded-2xl bg-white border-gray-200 text-xs font-bold justify-start text-black">
                            <CalendarIcon className="mr-2 h-4 w-4 text-black" />
                            {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'Dari'} - {dateTo ? format(dateTo, 'dd MMM yyyy') : 'Sampai'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b text-xs font-black uppercase tracking-widest text-black">Pilih Rentang Waktu</div>
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
                             <Button variant="ghost" size="sm" className="text-[10px] font-bold text-black" onClick={() => { setDateFrom(startOfDay(new Date())); setDateTo(new Date()); }}>HARI INI</Button>
                             <Button variant="ghost" size="sm" className="text-[10px] font-bold text-black" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>SEMUA</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Filter Piutang Saja */}
                <Button 
                    variant={unsettledOnly ? 'default' : 'outline'}
                    className={cn(
                        "h-11 rounded-2xl text-[10px] font-black px-4 transition-all",
                        unsettledOnly ? "bg-black text-white" : "bg-white border-gray-200 text-black hover:bg-gray-100"
                    )}
                    onClick={() => setUnsettledOnly(!unsettledOnly)}
                >
                    <Filter className="mr-1.5 h-3 w-3" /> {unsettledOnly ? 'PIUTANG SAJA' : 'SEMUA STATUS'}
                </Button>
            </div>

            {/* Quick Filter: Metode Pembayaran (Cash vs ATM) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] font-black uppercase text-gray-400 mr-1 shrink-0">Metode:</span>
              <button
                type="button"
                onClick={() => setPaymentMethod('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                  paymentMethod === 'ALL' ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Semua ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1",
                  paymentMethod === 'CASH' ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Banknote className="h-3.5 w-3.5" /> Tunai / Cash ({transactions.filter(t => t.is_cash).length})
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('TABUNGAN')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1",
                  paymentMethod === 'TABUNGAN' ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Wallet className="h-3.5 w-3.5" /> Tabungan / ATM ({transactions.filter(t => !t.is_cash).length})
              </button>
            </div>

            {/* Pencarian */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Cari nama santri, NIS, atau rincian item..." 
                    className="pl-11 h-11 rounded-2xl border-gray-200 bg-white text-xs font-bold text-black"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-3">
        {loading ? (
            <div className="py-20 text-center animate-pulse space-y-4">
                <div className="h-20 w-full bg-gray-100 rounded-3xl" />
                <div className="h-20 w-full bg-gray-100 rounded-3xl" />
                <div className="h-20 w-full bg-gray-100 rounded-3xl" />
            </div>
        ) : filteredTransactions.length > 0 ? (
            <>
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      Menampilkan {filteredTransactions.length} Transaksi
                  </p>
                  <p className="text-xs font-black text-black">
                      Subtotal: Rp {filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString('id-ID')}
                  </p>
                </div>

                {filteredTransactions.map((tx) => {
                    const isCash = tx.is_cash;
                    const customerName = isCash
                        ? (tx.description?.split(':')[0]?.replace('Tunai [', '').replace(']', '') || 'Pembeli Tunai')
                        : (tx.students?.name || 'Siswa');
                    const itemsText = tx.description?.includes(':') ? tx.description.split(':')[1]?.trim() : '';

                    return (
                        <Card key={tx.id} className="border border-gray-200 rounded-3xl shadow-sm bg-white overflow-hidden transition-all hover:border-gray-400">
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "h-11 w-11 rounded-2xl flex items-center justify-center border shrink-0",
                                        isCash ? "bg-gray-100 border-gray-300 text-black" : (tx.is_settled ? "bg-gray-50 border-gray-200 text-black" : "bg-gray-100 border-black text-black")
                                    )}>
                                        {isCash ? <Banknote className="h-5 w-5 text-black" /> : <Wallet className="h-5 w-5 text-black" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-black text-black text-sm truncate">
                                              {customerName}
                                          </p>
                                          <span className={cn(
                                            "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                            isCash ? "bg-black text-white border-black" : "bg-gray-100 text-gray-800 border-gray-300"
                                          )}>
                                            {isCash ? 'CASH' : 'ATM / KARTU'}
                                          </span>
                                        </div>

                                        {itemsText && (
                                          <p className="text-[11px] text-gray-600 font-medium truncate mt-0.5">
                                            {itemsText}
                                          </p>
                                        )}

                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold mt-0.5">
                                            <span>{format(new Date(tx.created_at), 'dd MMM yyyy • HH:mm', { locale: id })}</span>
                                            {!isCash && tx.students?.class && (
                                              <>
                                                <span>•</span>
                                                <span>Kelas {tx.students.class}</span>
                                              </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="font-black text-black text-base font-mono">
                                        Rp {tx.amount.toLocaleString('id-ID')}
                                    </p>
                                    <div className="mt-1">
                                      {isCash ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gray-100 text-black border border-gray-300">
                                          <CheckCircle2 className="h-2.5 w-2.5 text-black" /> Lunas di Laci
                                        </span>
                                      ) : tx.is_settled ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gray-100 text-black border border-gray-300">
                                          <CheckCircle2 className="h-2.5 w-2.5 text-black" /> Sudah Dicairkan
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-black text-white border border-black">
                                          <AlertCircle className="h-2.5 w-2.5 text-white" /> Piutang Sekolah
                                        </span>
                                      )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </>
        ) : (
            <div className="py-24 text-center text-muted-foreground space-y-4 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                <History className="h-12 w-12 mx-auto text-gray-300" />
                <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-wider text-black">Data Transaksi Tidak Ditemukan</p>
                    <p className="text-xs font-medium text-gray-500">Coba ubah rentang tanggal atau filter metode pembayaran.</p>
                </div>
                <Button variant="outline" className="text-xs font-bold text-black border-black" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setUnsettledOnly(false); setPaymentMethod('ALL'); }}>Reset Semua Filter</Button>
            </div>
        )}
      </div>
    </div>
  );
}
