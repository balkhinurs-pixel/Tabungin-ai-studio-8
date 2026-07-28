
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, BookOpen, Banknote } from 'lucide-react';
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
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface AddDepositPageProps {
    params: {
        id: string;
    };
}

export default function AddDepositPage({ params }: AddDepositPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState(''); 
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const studentId = params.id;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hanya ambil angka murni agar stabil di mobile
    const rawValue = e.target.value.replace(/\D/g, '');
    setAmount(rawValue);
  };

  const formatCurrency = (val: string) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('transactions')
      .insert({ 
        student_id: studentId,
        user_id: user?.id,
        amount: numericAmount, 
        description,
        created_at: date.toISOString(),
        type: 'Pemasukan'
    });
    
    setLoading(false);

    if (error) {
        toast({
            title: 'Gagal Menyimpan Transaksi',
            description: error.message,
            variant: 'destructive',
        });
    } else {
        toast({
            title: 'Transaksi Berhasil',
            description: `Setoran sebesar ${formatCurrency(amount)} telah disimpan.`,
        });
        router.push(`/profiles/${studentId}`);
        router.refresh(); 
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
            
            <div className="space-y-2">
              <Label htmlFor="date" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tanggal Transaksi</Label>
               <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
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
                      onSelect={setDate}
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
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white h-14 rounded-2xl text-lg font-bold shadow-lg shadow-green-100 transition-all active:scale-95" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Banknote className="mr-2 h-5 w-5" />}
              Simpan Setoran
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

