'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Banknote, 
  Loader2, 
  Store,
  CheckCircle2,
  Info,
  Printer
} from 'lucide-react';
import { getMerchantSettlementStatsAction, settleMerchantTransactionsAction, getUnsettledTransactionDetailsAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function SettlementManagement() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getMerchantSettlementStatsAction();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch settlement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePrintReceipt = async (merchantId: string, merchantName: string, amount: number) => {
    setPrintingId(merchantId);
    try {
        const details = await getUnsettledTransactionDetailsAction(merchantId);
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('BUKTI SERAH TERIMA OMZET KANTIN', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, pageWidth / 2, 27, { align: 'center' });
        doc.line(14, 32, pageWidth - 14, 32);

        // Merchant Info
        doc.setFontSize(11);
        doc.text(`Nama Outlet: ${merchantName}`, 14, 42);
        doc.text(`Status: BELUM DIBAYARKAN (MENUNGGU PENCAIRAN)`, 14, 48);

        // Table
        autoTable(doc, {
            startY: 55,
            head: [['TANGGAL', 'NIS', 'NAMA SISWA', 'KELAS', 'NOMINAL (RP)']],
            body: details.map((tx: any) => [
                format(new Date(tx.created_at), 'dd/MM/yy HH:mm'),
                tx.students?.nis,
                tx.students?.name,
                tx.students?.class,
                { content: tx.amount.toLocaleString('id-ID'), styles: { halign: 'right' } }
            ]),
            foot: [
                [{ content: 'TOTAL YANG HARUS DIBAYARKAN', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } }, 
                 { content: amount.toLocaleString('id-ID'), styles: { fontStyle: 'bold', halign: 'right' } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] },
            footStyles: { fillColor: [241, 245, 249] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;

        // Signatures
        doc.text('Pihak Sekolah (Guru)', 40, finalY, { align: 'center' });
        doc.text('____________________', 40, finalY + 25, { align: 'center' });
        
        doc.text('Pengelola Kantin', pageWidth - 40, finalY, { align: 'center' });
        doc.text('____________________', pageWidth - 40, finalY + 25, { align: 'center' });

        doc.save(`settlement-${merchantName.toLowerCase()}-${format(new Date(), 'yyyyMMdd')}.pdf`);
        toast({ title: "PDF Berhasil Dibuat" });
    } catch (error) {
        toast({ title: "Gagal membuat PDF", variant: "destructive" });
    } finally {
        setPrintingId(null);
    }
  };

  const handleSettle = async (merchantId: string) => {
    setProcessingId(merchantId);
    const result = await settleMerchantTransactionsAction(merchantId);
    setProcessingId(null);

    if (result.success) {
      toast({ title: "Settlement Berhasil", description: "Status omzet telah diperbarui menjadi Terbayar." });
      fetchStats();
    } else {
      toast({ title: "Gagal Proses", description: result.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sinkronisasi Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-100 text-blue-800 rounded-2xl">
        <Info className="h-5 w-5 text-blue-500" />
        <AlertDescription className="text-[11px] leading-relaxed font-medium">
            Halaman ini menampilkan total penjualan kantin yang <strong>uang fisiknya masih ada di tangan Anda (Guru)</strong>. Tekan tombol cairkan setelah Anda memberikan uang tunai kepada pengelola kantin.
        </AlertDescription>
      </Alert>

      {stats.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {stats.map((item) => (
            <Card key={item.merchantId} className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden border border-gray-100">
              <CardContent className="p-6 space-y-6">
                {/* Header Section: Ikon, Nama, dan Status */}
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 text-orange-500 shadow-inner shrink-0">
                    <Store className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-black text-lg text-gray-900 leading-tight uppercase tracking-tight">{item.merchantName}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Omzet Belum Cair</p>
                    </div>
                  </div>
                </div>

                {/* Main Content Section: Nominal (Stack Below) */}
                <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/10 transition-all group-hover:bg-primary/10">
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">Total Dana Tersedia</p>
                    <p className="font-black text-3xl text-primary tracking-tighter break-all">
                      {item.unsettledAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                    </p>
                </div>
                
                {/* Action Section */}
                <div className="flex flex-col gap-3">
                    {item.unsettledAmount > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button 
                                variant="outline" 
                                className="h-14 rounded-2xl text-xs font-black border-blue-100 text-blue-600 hover:bg-blue-50 shadow-sm"
                                onClick={() => handlePrintReceipt(item.merchantId, item.merchantName, item.unsettledAmount)}
                                disabled={printingId === item.merchantId}
                            >
                                {printingId === item.merchantId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} 
                                CETAK RINCIAN
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black shadow-lg shadow-emerald-100 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all">
                                        <Banknote className="mr-2 h-4 w-4" /> PROSES PENCAIRAN
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem]">
                                    <AlertDialogHeader>
                                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                        <CheckCircle2 className="h-6 w-6" />
                                        <AlertDialogTitle className="font-black uppercase tracking-tight">Konfirmasi Pembayaran</AlertDialogTitle>
                                    </div>
                                    <AlertDialogDescription className="text-sm font-medium">
                                        Apakah Anda sudah menyerahkan uang tunai sebesar <span className="font-black text-gray-900">{item.unsettledAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span> kepada <span className="font-black text-gray-900">{item.merchantName}</span>? 
                                        <br/><br/>
                                        Status omzet di dashboard kantin akan kembali ke nol setelah konfirmasi ini.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel className="rounded-xl font-bold">Belum</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={() => handleSettle(item.merchantId)}
                                        className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold"
                                    >
                                        Ya, Sudah Bayar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ) : (
                        <div className="w-full py-6 bg-gray-50 rounded-[2rem] text-center border border-dashed border-gray-200">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Semua Omzet Telah Cair
                            </span>
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed rounded-[3rem] border-gray-100 bg-gray-50/50">
          <Banknote className="h-14 w-14 mx-auto text-gray-200 mb-4 opacity-30" />
          <div className="space-y-1">
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Belum Ada Transaksi</p>
            <p className="text-[10px] text-gray-400 font-medium">Data transaksi kantin akan muncul di sini.</p>
          </div>
        </div>
      )}
    </div>
  );
}
