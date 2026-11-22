
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, BookOpen, Banknote, Loader2, WifiOff, SearchCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { submitTeacherDepositAction } from '../../actions';
import { checkTransactionStatusByKey } from '@/app/actions/transaction-guard';
import { executeWithNetworkGuard, generateIdempotencyKey } from '@/lib/transaction-client';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface AddDepositPageProps {
    params: {
        id: string;
    };
}

export default function AddDepositPage({ params }: AddDepositPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState(''); 
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSlowSubmitting, setIsSlowSubmitting] = useState(false);
  const [networkErrorMsg, setNetworkErrorMsg] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey('dep'));
  const studentId = params.id;

  const resetPendingKeyOnEdit = () => {
    if (networkErrorMsg) {
      setNetworkErrorMsg(null);
      idempotencyKeyRef.current = generateIdempotencyKey('dep');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hanya ambil angka murni agar stabil di mobile
    const rawValue = e.target.value.replace(/\D/g, '');
    setAmount(rawValue);
    resetPendingKeyOnEdit();
  };

  const formatCurrency = (val: string) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(val));
  };

  const submitDeposit = async () => {
    if (isSubmittingRef.current) return;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
        toast({
            title: 'Jumlah Tidak Valid',
            description: 'Mohon masukkan jumlah yang valid.',
            variant: 'destructive',
        });
        return;
    }

    if (!date) {
        toast({
            title: 'Tanggal Tidak Valid',
            description: 'Mohon pilih tanggal transaksi.',
            variant: 'destructive',
        });
        return;
    }

    if (!description.trim()) {
        toast({
            title: 'Keterangan Wajib Diisi',
            description: 'Mohon isi keterangan setoran terlebih dahulu.',
            variant: 'destructive',
        });
        return;
    }

    if (!isOnline) {
        const offlineMsg = 'Koneksi internet terputus. Pastikan Wi-Fi atau paket data aktif lalu coba simpan kembali.';
        setNetworkErrorMsg(offlineMsg);
        toast({
            title: 'Anda Sedang Offline',
            description: offlineMsg,
            variant: 'destructive',
        });
        return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setIsSlowSubmitting(false);
    setNetworkErrorMsg(null);

    try {
      const guardRes = await executeWithNetworkGuard(
        () => submitTeacherDepositAction({
          studentId,
          amount: numericAmount,
          description: description.trim(),
          dateIso: date.toISOString(),
          idempotencyKey: idempotencyKeyRef.current,
        }),
        {
          slowThresholdMs: 4500,
          timeoutMs: 15000,
          onSlowConnection: () => {
            setIsSlowSubmitting(true);
            toast({
              title: 'Koneksi Agak Lambat...',
              description: 'Sistem masih menunggu konfirmasi server. Jangan tutup halaman atau klik simpan lagi.',
            });
          },
        }
      );

      if (!guardRes.ok || !guardRes.data) {
        const msg = guardRes.message || 'Koneksi terputus saat menyimpan setoran. Silakan cek status sebelum mengulang.';
        setNetworkErrorMsg(msg);
        toast({
          title: guardRes.failureKind === 'TIMEOUT' ? 'Waktu Tunggu Habis' : 'Koneksi Bermasalah',
          description: msg,
          variant: 'destructive',
        });
        return;
      }

      const result = guardRes.data;

      if (!result.success) {
        idempotencyKeyRef.current = generateIdempotencyKey('dep');
        toast({
            title: 'Gagal Menyimpan Transaksi',
            description: result.message,
            variant: 'destructive',
        });
      } else {
        idempotencyKeyRef.current = generateIdempotencyKey('dep');
        toast({
            title: 'Transaksi Berhasil',
            description: `Setoran sebesar ${formatCurrency(amount)} telah disimpan.`,
        });
        router.replace(`/profiles/${studentId}`);
        router.refresh(); 
      }
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
      setIsSlowSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitDeposit();
  };

  const handleCheckPending = async () => {
    if (isCheckingStatus) return;
    setIsCheckingStatus(true);
    try {
      const check = await checkTransactionStatusByKey(idempotencyKeyRef.current);
      if (check.status === 'DONE' && check.result?.success) {
        idempotencyKeyRef.current = generateIdempotencyKey('dep');
        setNetworkErrorMsg(null);
        toast({
          title: 'Setoran Sudah Tercatat!',
          description: 'Transaksi sebelumnya sudah masuk ke server. Tidak perlu kirim ulang.',
        });
        router.replace(`/profiles/${studentId}`);
        router.refresh();
      } else if (check.status === 'PROCESSING') {
        toast({
          title: 'Masih Diproses Server',
          description: check.message,
        });
      } else {
        toast({
          title: 'Belum Tercatat di Server',
          description: 'Aman untuk menekan tombol "Kirim Ulang (Aman)".',
        });
      }
    } catch {
      toast({
        title: 'Gagal Memeriksa Status',
        description: 'Koneksi masih terputus. Pastikan internet kembali aktif.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-muted-foreground hover:text-primary">
        <Link href={`/profiles/${studentId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Profil
        </Link>
      </Button>

      <Card className="border-none shadow-xl overflow-hidden rounded-2xl">
        <div className="bg-green-500 p-6 text-white text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Banknote className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Input Setoran Siswa</h1>
            <p className="text-green-50 text-xs mt-1 opacity-80 uppercase tracking-widest font-medium">Catat Transaksi Masuk</p>
        </div>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {!isOnline && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                <WifiOff className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Koneksi internet terputus. Tombol simpan dinonaktifkan sementara untuk mencegah gagal atau data ganda.</span>
              </div>
            )}

            {networkErrorMsg && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Koneksi Gagal / Terputus Saat Mengirim</p>
                    <p className="text-amber-800 leading-relaxed">{networkErrorMsg}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCheckPending}
                    disabled={isCheckingStatus || loading}
                    className="flex-1 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 font-bold text-xs gap-1.5"
                  >
                    {isCheckingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SearchCheck className="h-3.5 w-3.5" />}
                    Cek Status Transaksi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={submitDeposit}
                    disabled={!isOnline || loading || isCheckingStatus}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Kirim Ulang (Aman)
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tanggal Transaksi</Label>
               <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      type="button"
                      disabled={loading}
                      className={cn(
                        "w-full justify-start text-left font-medium h-12 border-gray-100 bg-gray-50/50 hover:bg-gray-50 rounded-xl",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                      {date ? format(date, "dd MMMM yyyy", { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => { setDate(d); resetPendingKeyOnEdit(); }}
                      initialFocus
                      locale={id}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    />
                  </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Jumlah Setoran</Label>
              
              <div className={cn(
                  "p-4 rounded-2xl border text-center transition-all duration-300 shadow-sm",
                  amount ? "bg-green-50 border-green-100 scale-[1.02]" : "bg-gray-50/50 border-gray-100 opacity-60"
              )}>
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-[0.2em] mb-1">Konfirmasi Nominal</p>
                  <p className="text-3xl font-black text-green-600 truncate tracking-tight">
                      {formatCurrency(amount)}
                  </p>
              </div>

              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground font-bold text-lg">Rp</span>
                <Input 
                  id="amount" 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Masukkan nominal..." 
                  className="pl-12 h-14 text-xl font-bold border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-green-500 rounded-xl transition-all" 
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Keterangan / Catatan</Label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="description" 
                  placeholder="Catatan transaksi..." 
                  className="pl-12 h-12 border-gray-100 bg-gray-50/50 focus:bg-white rounded-xl transition-all" 
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); resetPendingKeyOnEdit(); }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white h-14 rounded-2xl text-lg font-bold shadow-lg shadow-green-100 transition-all active:scale-95" disabled={loading || !isOnline}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Banknote className="mr-2 h-5 w-5" />}
              {loading
                ? (isSlowSubmitting ? 'Koneksi Lambat, Mohon Tunggu...' : 'Menyimpan Setoran...')
                : 'Simpan Setoran'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

