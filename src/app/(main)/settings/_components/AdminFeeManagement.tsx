
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Loader2, 
  Settings2,
  Building2,
  Zap,
  History,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  updateAdminFeeConfigAction, 
  processBatchAdminFeeAction,
  getAdminFeeStatsAction 
} from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminFeeManagement() {
  const [fee, setFee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const { toast } = useToast();
  
  // Memoize supabase client to prevent unnecessary re-renders and effect triggers
  const supabase = useMemo(() => createClient(), []);

  const fetchConfig = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('admin_fee')
                .eq('id', user.id)
                .maybeSingle();
            
            if (error) throw error;
            if (data) setFee(data.admin_fee?.toString() || '0');
        }
    } catch (err: any) {
        console.error('[FETCH_CONFIG_ERROR]', err.message);
    } finally {
        setLoading(false);
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
        const data = await getAdminFeeStatsAction();
        setStats(data || []);
    } catch (err) {
        console.error('[FETCH_STATS_ERROR]', err);
    } finally {
        setLoadingStats(false);
    }
  }

  useEffect(() => {
    fetchConfig();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleSaveConfig = async () => {
    if (!fee || isNaN(parseInt(fee))) {
        toast({ title: "Input Tidak Valid", description: "Masukkan nominal angka yang benar.", variant: "destructive" });
        return;
    }

    setSaving(true);
    try {
        const result = await updateAdminFeeConfigAction(parseInt(fee));
        if (result.success) {
            toast({ title: "Berhasil", description: result.message });
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
    } catch (err: any) {
        toast({ title: "Kesalahan Sistem", description: err.message, variant: "destructive" });
    } finally {
        setSaving(false);
    }
  };

  const handleProcessFees = async () => {
    const currentMonth = format(new Date(), 'MMMM yyyy', { locale: id });
    setProcessing(true);
    
    try {
        const result = await processBatchAdminFeeAction(currentMonth);
        if (result.success) {
            toast({ title: "Selesai", description: result.message });
            fetchStats(); // Refresh stats after processing
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
    } catch (err: any) {
        toast({ title: "Terjadi Kesalahan", description: err.message, variant: "destructive" });
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Menyiapkan konfigurasi...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 1. Configuration Section */}
      <Card className="rounded-[2rem] border-none bg-gray-50/50 overflow-hidden">
        <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Settings2 className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">Pengaturan Biaya</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Atur nominal bulanan</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nominal Potongan (Rp)</Label>
                    <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                        <Input 
                            value={fee}
                            onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))}
                            placeholder="Contoh: 2000"
                            className="pl-12 h-14 rounded-2xl border-gray-100 bg-white text-lg font-black tracking-tight focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <Button 
                    onClick={handleSaveConfig} 
                    disabled={saving}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    SIMPAN KONFIGURASI
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* 2. Execution Section */}
      <Card className="rounded-[2rem] border-2 border-dashed border-indigo-100 bg-white">
        <CardContent className="p-8 text-center space-y-6">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                <Zap className="h-10 w-10 text-indigo-600 fill-indigo-600" />
            </div>
            
            <div className="space-y-1">
                <h3 className="font-black text-xl tracking-tight text-gray-900">Eksekusi Bulanan</h3>
                <p className="text-xs text-gray-500 font-medium px-4">
                    Tombol ini akan memotong saldo seluruh siswa secara otomatis untuk biaya admin bulan <span className="text-indigo-600 font-bold">{format(new Date(), 'MMMM yyyy', { locale: id })}</span>.
                </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                    Sistem memiliki proteksi otomatis. Siswa yang sudah ditarik biaya admin di bulan yang sama tidak akan terpotong dua kali.
                </p>
            </div>

            <Button 
                onClick={handleProcessFees}
                disabled={processing || parseInt(fee || '0') <= 0}
                className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-base shadow-xl active:scale-95 transition-all"
            >
                {processing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> SEDANG MEMPROSES...</>
                ) : (
                    <><Zap className="mr-2 h-5 w-5" /> TARIK BIAYA ADMIN MASSAL</>
                )}
            </Button>
        </CardContent>
      </Card>

      {/* 3. Stats Section - Rekap Pengumpulan */}
      <Card className="rounded-[2rem] border-none bg-indigo-50/30 overflow-hidden">
        <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <History className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">Rekap Pengumpulan</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Dana admin terkumpul</p>
                </div>
            </div>

            <div className="space-y-3">
                {loadingStats ? (
                    <div className="space-y-2">
                        <div className="h-14 w-full animate-pulse bg-white rounded-2xl" />
                        <div className="h-14 w-full animate-pulse bg-white rounded-2xl" />
                    </div>
                ) : stats.length > 0 ? (
                    stats.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-50 shadow-sm transition-all hover:shadow-md">
                            <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.month}</p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{item.count} Siswa Terproses</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-indigo-600">
                                    Rp {item.total.toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 opacity-30 border-2 border-dashed border-indigo-100 rounded-2xl bg-white/50">
                        <History className="h-10 w-10 mx-auto mb-2 text-indigo-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Belum ada rekap penarikan</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 justify-center py-4">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sistem Perbankan Terverifikasi</span>
      </div>
    </div>
  );
}
