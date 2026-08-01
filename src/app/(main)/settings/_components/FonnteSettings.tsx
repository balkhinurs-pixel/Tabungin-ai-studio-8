'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Send, 
  Save, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Info, 
  Sparkles, 
  PhoneCall, 
  RefreshCw,
  Clock,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { 
  getFonnteSettingsAction, 
  saveFonnteSettingsAction, 
  sendTestFonnteWAAction, 
  checkAndSendLowBalanceWAAction 
} from '@/app/settings/fonnte-actions';

export default function FonnteSettings() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [checkingBatch, setCheckingBatch] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // States
  const [fonnteToken, setFonnteToken] = useState('');
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number>(10000);
  const [lowBalanceTemplate, setLowBalanceTemplate] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [testPhone, setTestPhone] = useState('');

  // Batch Result Log
  const [batchLogs, setBatchLogs] = useState<{
    totalChecked: number;
    totalLowBalance: number;
    totalSent: number;
    logs: string[];
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const res = await getFonnteSettingsAction();
    if (res.success) {
      setFonnteToken(res.fonnteToken || '');
      setLowBalanceThreshold(res.lowBalanceThreshold || 10000);
      setLowBalanceTemplate(res.lowBalanceTemplate || '');
      setSchoolCode(res.schoolCode || '');
    } else {
      toast({ title: "Gagal memuat pengaturan", description: res.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!fonnteToken.trim()) {
      toast({ title: "Token Fonnte Wajib Diisi", description: "Masukkan Token API Fonnte dari dashboard fonnte.com", variant: "destructive" });
      return;
    }

    setSaving(true);
    const res = await saveFonnteSettingsAction({
      fonnteToken,
      lowBalanceThreshold,
      lowBalanceTemplate
    });
    setSaving(false);

    if (res.success) {
      toast({ title: "Berhasil Disimpan", description: res.message });
    } else {
      toast({ title: "Gagal Menyimpan", description: res.message, variant: "destructive" });
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast({ title: "Nomor Tes Kosong", description: "Masukkan nomor WhatsApp untuk menerima pesan tes.", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    const res = await sendTestFonnteWAAction(testPhone);
    setSendingTest(false);

    if (res.success) {
      toast({ title: "Pesan Tes Terkirim! 🚀", description: "Silakan periksa WhatsApp Anda." });
    } else {
      toast({ title: "Gagal Kirim Tes", description: res.message, variant: "destructive" });
    }
  };

  const handleRunBatchCheck = async () => {
    if (!fonnteToken.trim()) {
      toast({ title: "Token Fonnte Belum Diisi", description: "Mohon simpan Token Fonnte terlebih dahulu.", variant: "destructive" });
      return;
    }

    setCheckingBatch(true);
    setBatchLogs(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await checkAndSendLowBalanceWAAction(baseUrl);
    setCheckingBatch(false);

    if (res.success) {
      setBatchLogs({
        totalChecked: res.totalChecked || 0,
        totalLowBalance: res.totalLowBalance || 0,
        totalSent: res.totalSent || 0,
        logs: res.logs || []
      });
      toast({ title: "Pemeriksaan Selesai", description: res.message });
    } else {
      toast({ title: "Gagal Memproses Batch", description: res.message, variant: "destructive" });
    }
  };

  const insertTag = (tag: string) => {
    setLowBalanceTemplate(prev => prev + ` ${tag}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-xs font-bold text-muted-foreground">Memuat Pengaturan Fonnte WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Banner Informasi Anti-Ban WhatsApp */}
      <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 rounded-2xl p-4">
        <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
        <div>
          <AlertTitle className="font-black text-sm text-emerald-950 flex items-center gap-2">
            Metode Pengiriman Aman & Bebas Ban (Anti-Spam)
          </AlertTitle>
          <AlertDescription className="text-xs text-emerald-800 space-y-1 mt-1 leading-relaxed">
            <p>• <strong>Khusus Saldo Minimal:</strong> Pesan WA HANYA dikirim jika sisa saldo siswa di bawah batas minimal (tidak dikirim saat transaksi rutin agar hemat & tidak dianggap spam).</p>
            <p>• <strong>Auto-Delay 2.5 Detik:</strong> Pengiriman otomatis diberi jeda waktu antar siswa untuk menjaga kesehatan nomor WhatsApp dari pemblokiran (ban).</p>
            <p>• <strong>Detail Login Lengkap:</strong> Pesan WA dilengkapi link login, kode sekolah, dan NIS agar orang tua mudah masuk ke aplikasi siswa.</p>
          </AlertDescription>
        </div>
      </Alert>

      {/* Kartu Integrasi Token Fonnte */}
      <Card className="shadow-sm border-primary/10 rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black">Integrasi API Fonnte WhatsApp</CardTitle>
              <CardDescription className="text-xs">Hubungkan nomor WhatsApp sekolah melalui layanan Fonnte.com</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          
          {/* Input Token Fonnte */}
          <div className="space-y-2">
            <Label htmlFor="fonnteToken" className="text-xs font-bold">Token API Fonnte</Label>
            <div className="relative">
              <Input 
                id="fonnteToken"
                type={showToken ? "text" : "password"}
                value={fonnteToken}
                onChange={(e) => setFonnteToken(e.target.value)}
                placeholder="Masukkan Token dari Fonnte.com (misal: xyZa123456...)"
                className="pr-10 font-mono text-xs h-11 rounded-xl"
              />
              <button 
                type="button" 
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Dapatkan token dari dashboard Fonnte Anda di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">fonnte.com</a>.
            </p>
          </div>

          {/* Batas Saldo Minimal (Threshold) */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="text-xs font-bold">Batas Minimum Saldo (Rp)</Label>
            <div className="flex items-center gap-3">
              <Input 
                id="threshold"
                type="number"
                value={lowBalanceThreshold}
                onChange={(e) => setLowBalanceThreshold(parseInt(e.target.value) || 0)}
                placeholder="10000"
                className="font-bold text-sm h-11 rounded-xl text-emerald-700 bg-emerald-50/50 border-emerald-200"
              />
              <div className="flex gap-1.5 shrink-0">
                {[5000, 10000, 20000, 50000].map(val => (
                  <button 
                    key={val}
                    type="button"
                    onClick={() => setLowBalanceThreshold(val)}
                    className="px-2.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-[10px] font-bold"
                  >
                    Rp {(val/1000)}k
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Siswa dengan sisa saldo &le; nominal ini yang akan dikirimi notifikasi WA.
            </p>
          </div>

          {/* Template Pesan WA Custom */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="template" className="text-xs font-bold">Template Pesan WhatsApp</Label>
              <span className="text-[10px] text-muted-foreground">Variabel Dinamis:</span>
            </div>

            {/* Tag Variabel Buttons */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button type="button" onClick={() => insertTag('{nama}')} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold">
                + &#123;nama&#125;
              </button>
              <button type="button" onClick={() => insertTag('{saldo}')} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold">
                + &#123;saldo&#125;
              </button>
              <button type="button" onClick={() => insertTag('{nis}')} className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-[10px] font-bold">
                + &#123;nis&#125;
              </button>
              <button type="button" onClick={() => insertTag('{kode_sekolah}')} className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-[10px] font-bold">
                + &#123;kode_sekolah&#125;
              </button>
              <button type="button" onClick={() => insertTag('{url_login}')} className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[10px] font-bold">
                + &#123;url_login&#125;
              </button>
            </div>

            <Textarea 
              id="template"
              rows={8}
              value={lowBalanceTemplate}
              onChange={(e) => setLowBalanceTemplate(e.target.value)}
              placeholder="Tulis format pesan WA..."
              className="text-xs font-mono leading-relaxed rounded-xl p-3 border-emerald-200"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Pengaturan Fonnte
          </Button>

        </CardContent>
      </Card>

      {/* Kartu Uji Coba & Eksekusi Batch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* TES KIRIM WA */}
        <Card className="shadow-sm rounded-2xl border-primary/10">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-emerald-600" /> Tes Kirim WhatsApp
            </CardTitle>
            <CardDescription className="text-[11px]">Uji coba koneksi Fonnte ke nomor HP Anda</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <Input 
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Nomor HP WhatsApp (misal: 081234567890)"
              className="h-10 text-xs font-bold rounded-xl"
            />
            <Button 
              onClick={handleSendTest} 
              disabled={sendingTest || !testPhone.trim()}
              variant="outline"
              className="w-full h-10 rounded-xl font-bold text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Kirim Pesan Tes Fonnte
            </Button>
          </CardContent>
        </Card>

        {/* EKSKUSI BATCH SALDO MINIMAL */}
        <Card className="shadow-sm rounded-2xl border-primary/10 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-emerald-950">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Cek & Kirim Ke Wali Murid
            </CardTitle>
            <CardDescription className="text-[11px]">Pindai semua siswa dengan saldo &le; Rp {lowBalanceThreshold.toLocaleString('id-ID')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Sistem akan memindai seluruh data siswa, memfilter saldo rendah, dan mengirimkan pesan WA dengan jeda 2.5 detik/siswa.
            </p>
            <Button 
              onClick={handleRunBatchCheck}
              disabled={checkingBatch}
              className="w-full h-10 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              {checkingBatch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim Pesan (Delay Anti-Ban)...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Jalankan Pengiriman WA Saldo Rendah
                </>
              )}
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Output Log Hasil Pengiriman Batch */}
      {batchLogs && (
        <Card className="shadow-sm rounded-2xl border-emerald-300 bg-slate-950 text-white p-5 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-emerald-400">Laporan Hasil Pengiriman WA Fonnte</h3>
              <p className="text-[10px] text-slate-400">
                Diperiksa: {batchLogs.totalChecked} Siswa | Saldo Rendah: {batchLogs.totalLowBalance} Siswa | Terkirim: {batchLogs.totalSent}
              </p>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
              Selesai 🟢
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-60 overflow-y-auto font-mono text-[11px] space-y-1.5">
            {batchLogs.logs.length === 0 ? (
              <p className="text-slate-500 italic">Tidak ada pesan yang perlu dikirim.</p>
            ) : (
              batchLogs.logs.map((log, idx) => (
                <div key={idx} className={log.startsWith('✅') ? "text-emerald-300" : "text-rose-400"}>
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
