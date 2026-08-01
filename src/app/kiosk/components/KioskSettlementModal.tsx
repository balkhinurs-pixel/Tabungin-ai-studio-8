'use client';

import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Coins, 
  ReceiptText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Banknote, 
  Clock, 
  UserCheck, 
  ArrowRight,
  TrendingDown,
  RotateCcw,
  Save,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getKioskDailySummaryAction, saveKioskSettlementAction } from '../actions';

interface KioskSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [
  { value: 100000, label: 'Rp 100.000' },
  { value: 50000, label: 'Rp 50.000' },
  { value: 20000, label: 'Rp 20.000' },
  { value: 10000, label: 'Rp 10.000' },
  { value: 5000, label: 'Rp 5.000' },
  { value: 2000, label: 'Rp 2.000' },
  { value: 1000, label: 'Rp 1.000' },
];

export default function KioskSettlementModal({ isOpen, onClose }: KioskSettlementModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DENOMINATIONS' | 'RESULT'>('SUMMARY');
  const [loading, setLoading] = useState(false);

  // States
  const [initialCash, setInitialCash] = useState<number>(1000000); // Default Modal Awal Rp 1 Juta
  const [guardName, setGuardName] = useState('');
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<Record<number, number>>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });
  const [manualPhysicalCash, setManualPhysicalCash] = useState<string>('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // System summary data
  const [summary, setSummary] = useState<{
    totalAmount: number;
    totalCount: number;
    transactions: Array<{
      id: string;
      amount: number;
      description: string;
      createdAt: string;
      studentName: string;
      studentNis: string;
      studentClass: string;
    }>;
  }>({
    totalAmount: 0,
    totalCount: 0,
    transactions: []
  });

  // Load persistent initial float or fetch summary on open
  useEffect(() => {
    if (isOpen) {
      const savedFloat = localStorage.getItem('kiosk_initial_cash');
      if (savedFloat) {
        setInitialCash(parseInt(savedFloat) || 1000000);
      }
      const savedGuard = localStorage.getItem('kiosk_guard_name');
      if (savedGuard) {
        setGuardName(savedGuard);
      }
      fetchDailySummary();
    }
  }, [isOpen]);

  const fetchDailySummary = async () => {
    setLoading(true);
    const res = await getKioskDailySummaryAction();
    if (res.success) {
      setSummary({
        totalAmount: res.totalAmount,
        totalCount: res.totalCount,
        transactions: res.transactions
      });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Total calculated from denomination counter
  const calculatedDenomTotal = DENOMINATIONS.reduce((sum, denom) => {
    const qty = counts[denom.value] || 0;
    return sum + (denom.value * qty);
  }, 0);

  // Actual physical cash in drawer
  const physicalCashInDrawer = isManualOverride 
    ? (parseInt(manualPhysicalCash || '0') || 0)
    : calculatedDenomTotal;

  // Expected Cash in Drawer = Initial Modal - Total Cash Out (Penarikan Siswa)
  const expectedCashInDrawer = Math.max(0, initialCash - summary.totalAmount);

  // Variance = Physical Cash - Expected Cash
  const variance = physicalCashInDrawer - expectedCashInDrawer;

  const handleDenomChange = (val: number, qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr || '0') || 0);
    setCounts(prev => ({ ...prev, [val]: qty }));
    setIsManualOverride(false);
  };

  const handleSaveInitialCash = (newVal: number) => {
    setInitialCash(newVal);
    localStorage.setItem('kiosk_initial_cash', newVal.toString());
    toast({ title: "Modal Awal Kas Disimpan", description: `Rp ${newVal.toLocaleString('id-ID')}` });
  };

  const handleSaveGuardName = (name: string) => {
    setGuardName(name);
    localStorage.setItem('kiosk_guard_name', name);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleSaveSettlement = async () => {
    setLoading(true);
    const res = await saveKioskSettlementAction({
      initialCash,
      totalWithdrawal: summary.totalAmount,
      expectedCash: expectedCashInDrawer,
      actualPhysicalCash: physicalCashInDrawer,
      variance,
      guardName,
      notes,
      denominations: counts
    });
    setLoading(false);

    if (res.success) {
      toast({ title: "Rekap Berhasil Disimpan!", description: res.message });
      onClose();
    } else {
      toast({ title: "Gagal Menyimpan", description: res.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">Rekap & Selisih Kas Penjaga Kios</h2>
              <p className="text-[11px] text-slate-400 font-medium">Laci Kasir • Kios Penarikan Tunai Mandiri</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/40 border-b border-slate-800 text-xs font-bold px-4">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={cn(
              "py-2.5 rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'SUMMARY' ? "bg-primary text-white font-black shadow-md" : "text-slate-400 hover:text-white"
            )}
          >
            <ReceiptText className="h-4 w-4" /> 1. Data Sistem
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DENOMINATIONS')}
            className={cn(
              "py-2.5 rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'DENOMINATIONS' ? "bg-primary text-white font-black shadow-md" : "text-slate-400 hover:text-white"
            )}
          >
            <Coins className="h-4 w-4" /> 2. Hitung Fisik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESULT')}
            className={cn(
              "py-2.5 rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === 'RESULT' ? "bg-emerald-600 text-white font-black shadow-md" : "text-slate-400 hover:text-white"
            )}
          >
            <CheckCircle2 className="h-4 w-4" /> 3. Rekap & Selisih
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">

          {/* TAB 1: DATA SISTEM & MODAL AWAL */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Card Modal Kas Awal */}
              <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">MODAL KAS AWAL SHIFT</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Uang Fisik Diterima dari Bendahara</span>
                </div>

                <div className="flex items-center gap-3">
                  <Input 
                    type="number"
                    value={initialCash}
                    onChange={(e) => handleSaveInitialCash(parseInt(e.target.value) || 0)}
                    placeholder="Masukkan nominal modal kas..."
                    className="h-11 bg-slate-900 border-slate-700 font-black text-emerald-400 text-base rounded-xl"
                  />
                  <div className="flex gap-1">
                    {[500000, 1000000, 2000000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSaveInitialCash(amt)}
                        className="px-2.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200"
                      >
                        {(amt/1000)}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid Metric System Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-950/40 border border-emerald-500/20 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-wider">MODAL AWAL KAS</span>
                  <p className="text-2xl font-black text-emerald-400">Rp {initialCash.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-slate-400">Modal uang kertas di laci</p>
                </div>

                <div className="bg-rose-950/40 border border-rose-500/20 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-rose-400/80 uppercase tracking-wider">TOTAL PENARIKAN SISWA</span>
                  <p className="text-2xl font-black text-rose-400">- Rp {summary.totalAmount.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-slate-400">{summary.totalCount} Siswa menarik tunai hari ini</p>
                </div>
              </div>

              {/* Target Calculation Box */}
              <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">EKSPEKTASI KAS DI LACI (SISTEM)</span>
                  <h3 className="text-2xl font-black text-white">Rp {expectedCashInDrawer.toLocaleString('id-ID')}</h3>
                  <p className="text-[10px] text-slate-400">Rumus: Modal Awal ({initialCash.toLocaleString('id-ID')}) - Penarikan ({summary.totalAmount.toLocaleString('id-ID')})</p>
                </div>
                <Button onClick={() => setActiveTab('DENOMINATIONS')} className="bg-primary text-white font-bold text-xs h-10 px-4 rounded-xl">
                  Lanjut Hitung Uang Fisik <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>

              {/* List Transaksi Hari Ini */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>Daftar Penarikan Tunai Hari Ini ({summary.totalCount})</span>
                  <button onClick={fetchDailySummary} className="text-primary hover:underline text-[11px] flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Refresh Data
                  </button>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2 max-h-48 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                  {summary.transactions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 font-medium">Belum ada penarikan tunai hari ini.</div>
                  ) : (
                    summary.transactions.map(tx => (
                      <div key={tx.id} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50 rounded-xl">
                        <div>
                          <p className="font-bold text-white">{tx.studentName} <span className="text-[10px] text-slate-400">({tx.studentClass || tx.studentNis})</span></p>
                          <p className="text-[10px] text-slate-400">{format(new Date(tx.createdAt), 'HH:mm')} • {tx.description}</p>
                        </div>
                        <span className="font-black text-rose-400 text-xs">- Rp {tx.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HITUNG PECAHAN LEMBAR UANG FISIK */}
          {activeTab === 'DENOMINATIONS' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40">
                <div>
                  <h4 className="text-xs font-black text-white">Hitung Lembaran Uang Fisik</h4>
                  <p className="text-[10px] text-slate-400">Masukkan jumlah lembar uang kertas/koin yang ada di laci kasir saat ini.</p>
                </div>
                <button 
                  onClick={() => setIsManualOverride(!isManualOverride)}
                  className="text-[10px] text-emerald-400 font-bold hover:underline"
                >
                  {isManualOverride ? "Hitung Per Lembar" : "Ketik Total Manual"}
                </button>
              </div>

              {!isManualOverride ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DENOMINATIONS.map(denom => {
                    const qty = counts[denom.value] || 0;
                    const subtotal = denom.value * qty;
                    return (
                      <div key={denom.value} className="bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-2xl flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-slate-200">{denom.label}</span>
                          <p className="text-[10px] text-emerald-400 font-bold">Subtotal: Rp {subtotal.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input 
                            type="number"
                            min="0"
                            value={qty || ''}
                            onChange={(e) => handleDenomChange(denom.value, e.target.value)}
                            placeholder="0"
                            className="w-16 h-9 bg-slate-900 border-slate-700 font-black text-center text-xs text-white rounded-xl"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">Lbr</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl space-y-2">
                  <label className="text-xs font-black text-slate-300">TOTAL FISIK REAL DI LACI (RP)</label>
                  <Input 
                    type="number"
                    value={manualPhysicalCash}
                    onChange={(e) => setManualPhysicalCash(e.target.value)}
                    placeholder="Contoh: 750000"
                    className="h-12 text-lg font-black bg-slate-900 border-emerald-500/50 text-emerald-400 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400">Ketik total langsung jika tidak ingin menghitung per lembar pecahan.</p>
                </div>
              )}

              {/* Total Physical Banner */}
              <div className="bg-emerald-950/50 border border-emerald-500/30 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">TOTAL UANG FISIK DI LACI</span>
                  <h3 className="text-2xl font-black text-emerald-400">Rp {physicalCashInDrawer.toLocaleString('id-ID')}</h3>
                </div>
                <Button onClick={() => setActiveTab('RESULT')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl">
                  Lihat Hasil & Selisih <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: HASIL REKAP, ANALISIS SELISIH & SIMPAN */}
          {activeTab === 'RESULT' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Result Status Banner */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-center gap-3.5",
                variance === 0 
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : variance < 0 
                  ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                  : "bg-blue-950/60 border-blue-500/40 text-blue-300"
              )}>
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-lg shadow-md",
                  variance === 0 ? "bg-emerald-600" : variance < 0 ? "bg-rose-600" : "bg-blue-600"
                )}>
                  {variance === 0 ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/40">
                    STATUS REKAP: {variance === 0 ? "PAS / MATCHED 🟢" : variance < 0 ? "DEFISIT / MINUS 🔴" : "SURPLUS / LEBIH 🔵"}
                  </div>
                  <h3 className="text-lg font-black tracking-tight mt-0.5">
                    {variance === 0 
                      ? "Uang Kas Laci Sesuai 100%!" 
                      : variance < 0 
                      ? `Selisih Kurang: Rp ${Math.abs(variance).toLocaleString('id-ID')}`
                      : `Selisih Lebih: Rp ${variance.toLocaleString('id-ID')}`}
                  </h3>
                  <p className="text-[11px] opacity-80 font-medium">
                    {variance === 0 
                      ? "Uang fisik di laci cocok dengan total penarikan sistem."
                      : variance < 0
                      ? "Uang fisik di laci lebih SEDIKIT dari perhitungan sistem. Periksa kembali catatan fisik."
                      : "Uang fisik di laci lebih BANYAK dari perhitungan sistem."}
                  </p>
                </div>
              </div>

              {/* Perbandingan Detail Metrics */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">1. Modal Kas Awal:</span>
                  <span className="font-bold text-white">Rp {initialCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">2. Total Penarikan Siswa:</span>
                  <span className="font-bold text-rose-400">- Rp {summary.totalAmount.toLocaleString('id-ID')} ({summary.totalCount} Tx)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-bold">
                  <span className="text-slate-300">3. Kas Seharusnya (Sistem Target):</span>
                  <span className="text-primary font-black">Rp {expectedCashInDrawer.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 font-bold">
                  <span className="text-slate-300">4. Kas Fisik Real (Hasil Hitung Laci):</span>
                  <span className="text-emerald-400 font-black">Rp {physicalCashInDrawer.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-sm font-black">
                  <span>SELISIH AKHIR:</span>
                  <span className={variance === 0 ? "text-emerald-400" : variance < 0 ? "text-rose-400" : "text-blue-400"}>
                    {variance >= 0 ? `+ Rp ${variance.toLocaleString('id-ID')}` : `- Rp ${Math.abs(variance).toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>

              {/* Guard Name & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Nama Penjaga Kios / Kasir</label>
                  <Input 
                    value={guardName}
                    onChange={(e) => handleSaveGuardName(e.target.value)}
                    placeholder="Contoh: Pak Budi (Kios 1)"
                    className="h-10 bg-slate-800 border-slate-700 text-xs font-bold rounded-xl text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Catatan Khusus (Opsional)</label>
                  <Input 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan jika ada selisih..."
                    className="h-10 bg-slate-800 border-slate-700 text-xs font-bold rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Printable Thermal Receipt Card Preview (Hidden on screen unless print triggered) */}
              <div id="kiosk-recap-receipt" className="hidden print:block p-4 font-mono text-xs text-black bg-white">
                <div className="text-center border-b border-dashed pb-2">
                  <h2 className="font-bold text-sm">REKAP KAS PENJAGA KIOS</h2>
                  <p className="text-[10px]">Laporan Penarikan Tunai & Cash Drawer</p>
                  <p className="text-[9px]">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
                <div className="py-2 space-y-1 border-b border-dashed">
                  <div className="flex justify-between"><span>Penjaga:</span><span>{guardName || 'Penjaga Kios'}</span></div>
                  <div className="flex justify-between"><span>Modal Awal:</span><span>Rp {initialCash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Total Penarikan:</span><span>Rp {summary.totalAmount.toLocaleString('id-ID')} ({summary.totalCount} Tx)</span></div>
                  <div className="flex justify-between"><span>Target Kas:</span><span>Rp {expectedCashInDrawer.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Fisik Laci:</span><span>Rp {physicalCashInDrawer.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between font-bold"><span>Selisih:</span><span>Rp {variance.toLocaleString('id-ID')}</span></div>
                </div>
                <p className="text-[9px] text-center pt-2">Tanda Tangan Penjaga: ___________________</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handlePrintReceipt} 
                  variant="outline" 
                  className="flex-1 h-11 border-slate-700 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4 text-emerald-400" /> Cetak Struk Rekap
                </Button>

                <Button 
                  onClick={handleSaveSettlement} 
                  disabled={loading}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan Rekap Shift"}
                </Button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
