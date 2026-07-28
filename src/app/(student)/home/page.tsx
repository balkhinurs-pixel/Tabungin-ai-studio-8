'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { Student, Transaction } from '@/types';
import { 
    Loader2, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Wallet, 
    Settings, 
    ShieldCheck, 
    Save, 
    KeyRound, 
    Ban, 
    AlertCircle,
    Building2,
    UtensilsCrossed,
    MonitorSmartphone,
    ShieldEllipsis,
    History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { changeStudentPinAction, updateDailyLimitAction } from './actions';
import { Separator } from '@/components/ui/separator';

const TransactionRow = ({ tx }: { tx: Transaction }) => {
    const isIncome = tx.type === 'Pemasukan';
    
    const getIcon = () => {
        if (isIncome) return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
        switch (tx.category) {
            case 'BIAYA_ADMIN': return <ShieldEllipsis className="h-5 w-5 text-indigo-600" />;
            case 'BELANJA_KANTIN': return <UtensilsCrossed className="h-5 w-5 text-orange-600" />;
            case 'TARIK_TUNAI': return <MonitorSmartphone className="h-5 w-5 text-blue-600" />;
            default: return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
        }
    };

    const getBgColor = () => {
        if (isIncome) return "bg-green-50";
        switch (tx.category) {
            case 'BIAYA_ADMIN': return "bg-indigo-50";
            case 'BELANJA_KANTIN': return "bg-orange-50";
            case 'TARIK_TUNAI': return "bg-blue-50";
            default: return "bg-red-50";
        }
    };

    return (
        <div className="flex items-center justify-between py-4 group">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-active:scale-90 shadow-sm border border-white",
                    getBgColor()
                )}>
                    {getIcon()}
                </div>
                <div>
                    <p className="font-bold text-sm text-gray-900 leading-tight">{tx.description || tx.type}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {tx.created_at ? format(parseISO(tx.created_at), 'd MMM, HH:mm', { locale: id }) : '-'}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className={cn(
                    "font-black text-sm",
                    isIncome ? "text-emerald-600" : "text-gray-900"
                )}>
                    {isIncome ? '+' : '-'} {tx.amount.toLocaleString('id-ID')}
                </p>
                {tx.category === 'BIAYA_ADMIN' && (
                    <span className="text-[7px] font-black bg-indigo-100 text-indigo-700 px-1 rounded">OFFICIAL</span>
                )}
            </div>
        </div>
    );
};

export default function StudentDashboardPage() {
    const supabase = createClient();
    const { toast } = useToast();
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Settings State
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [dailyLimit, setDailyLimit] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const formatCurrency = (val: number) => 
        val.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { data, error: fetchError } = await supabase
                        .from('students')
                        .select('id, nis, name, class, daily_limit, transactions(*)')
                        .eq('id', user.id)
                        .single();
                    
                    if (fetchError) {
                        if (fetchError.code === '42703') {
                            setError("Kolom database belum tersedia. Hubungi Admin.");
                        } else {
                            setError("Gagal memuat data akun.");
                        }
                    } else if (data) {
                        const typedStudent = data as Student;
                        typedStudent.transactions = (typedStudent.transactions || []).sort((a,b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
                        setStudent(typedStudent);
                        setDailyLimit(typedStudent.daily_limit?.toString() || '');
                    }
                }
            } catch (err) {
                setError("Kesalahan sistem internal.");
            }
            setLoading(false);
        };
        fetchStudentData();
    }, [supabase]);

    const handleSaveChanges = async () => {
        setSaving(true);
        if (newPin) {
            if (newPin.length < 6) {
                toast({ title: "PIN Terlalu Pendek", variant: "destructive" });
                setSaving(false); return;
            }
            if (newPin !== confirmPin) {
                toast({ title: "PIN Tidak Cocok", variant: "destructive" });
                setSaving(false); return;
            }
            const pinRes = await changeStudentPinAction(newPin);
            if (!pinRes.success) {
                toast({ title: "Gagal Ganti PIN", variant: "destructive" });
                setSaving(false); return;
            }
        }

        const limitVal = dailyLimit ? parseInt(dailyLimit) : null;
        const limitRes = await updateDailyLimitAction(limitVal);
        setSaving(false);

        if (limitRes.success) {
            toast({ title: "Berhasil", description: "Pengaturan disimpan." });
            setDialogOpen(false);
            setNewPin(''); setConfirmPin('');
            if (student) setStudent({ ...student, daily_limit: limitVal });
        }
    };

    if (loading) return <div className="flex justify-center items-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error || !student) return <div className="p-8 text-center"><AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2"/><p>{error || "Data tidak ditemukan."}</p></div>;

    const { income, expense, balance } = (student.transactions || []).reduce(
        (acc, tx) => {
          if (tx.type === 'Pemasukan') acc.income += tx.amount;
          else acc.expense += tx.amount;
          acc.balance = acc.income - acc.expense;
          return acc;
        },
        { income: 0, expense: 0, balance: 0 }
    );

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todaySpending = (student.transactions || [])
        .filter(tx => tx.type === 'Pengeluaran' && new Date(tx.created_at!) >= todayStart)
        .reduce((sum, tx) => sum + tx.amount, 0);

    return (
        <div className="space-y-6 pb-24 max-w-md mx-auto">
            <div className="flex justify-between items-center px-1">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tight text-gray-900">Halo, {student.name.split(' ')[0]}</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Anda Aman Terjaga</p>
                </div>
                
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full bg-white shadow-sm h-10 w-10">
                            <Settings className="h-5 w-5 text-gray-400" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem] max-sm:w-[95%]">
                        <DialogHeader>
                            <DialogTitle className="font-black uppercase tracking-tight">Privasi & Keamanan</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-5 py-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limit Jajan Harian</Label>
                                <div className="relative">
                                    <Ban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="Tanpa Batas" 
                                        className="pl-10 h-12 rounded-xl font-bold"
                                        value={dailyLimit}
                                        onChange={(e) => setDailyLimit(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ubah PIN Login</Label>
                                <Input 
                                    type="password" inputMode="numeric" maxLength={6}
                                    placeholder="6 Digit PIN Baru" className="h-12 rounded-xl"
                                    value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                />
                                <Input 
                                    type="password" inputMode="numeric" maxLength={6}
                                    placeholder="Ulangi PIN" className="h-12 rounded-xl"
                                    value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveChanges} disabled={saving} className="w-full h-14 rounded-2xl bg-primary font-black shadow-xl">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "SIMPAN PENGATURAN"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-gradient-to-br from-primary via-blue-600 to-blue-800 text-primary-foreground shadow-2xl border-none relative overflow-hidden h-[240px] rounded-[2.5rem]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <CardContent className="p-8 relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-black tracking-tighter text-white">Tabung.in</span>
                        <div className="px-3 py-1 bg-white/20 rounded-full border border-white/20 backdrop-blur-sm">
                            <p className="text-[9px] font-black tracking-widest uppercase">Akun Siswa</p>
                        </div>
                    </div>
                    <div className="mt-auto">
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Saldo Tersedia</p>
                        <p className="text-4xl font-black tracking-tighter drop-shadow-lg">{formatCurrency(balance)}</p>
                        <div className="mt-6 flex items-center justify-between bg-black/10 rounded-2xl p-3 border border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Pemakaian Hari Ini:</p>
                            <p className="text-[10px] font-black">
                                {student.daily_limit ? `${formatCurrency(todaySpending)} / ${formatCurrency(student.daily_limit)}` : 'TIDAK TERBATAS'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4 px-1">
                <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[9px] uppercase font-black tracking-widest text-emerald-700/60 mb-1">Pemasukan</p>
                    <p className="font-black text-emerald-600 text-sm">+{income.toLocaleString('id-ID')}</p>
                </div>
                <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-700/60 mb-1">Pengeluaran</p>
                    <p className="font-black text-slate-600 text-sm">-{expense.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="pb-2 border-b border-gray-50">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Jurnal Transaksi</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <History className="h-4 w-4 text-gray-300" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-4 divide-y divide-gray-50">
                    {student.transactions && student.transactions.length > 0 ? (
                        student.transactions.slice(0, 15).map(tx => <TransactionRow key={tx.id} tx={tx} />)
                    ) : (
                        <div className="text-center py-20 opacity-20">
                            <Wallet className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada aktivitas</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}