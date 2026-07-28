
import Link from 'next/link';
import { ArrowLeft, PlusCircle, MinusCircle, Wallet, TrendingUp, TrendingDown, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Student } from '@/types';
import { createClient } from '@/lib/utils/supabase/server';
import PrintReportButton from './_components/PrintReportButton';
import SendWAButton from './_components/SendWAButton';
import TransactionList from './_components/TransactionList';
import { cn } from '@/lib/utils';

interface StudentProfilePageProps {
    params: {
        id: string;
    };
}

const StatMiniCard = ({ title, value, type }: { title: string, value: string, type: 'income' | 'expense' }) => (
    <div className={cn(
        "flex flex-col p-4 rounded-2xl border shadow-sm transition-all duration-300",
        type === 'income' ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
    )}>
        <div className="flex items-center gap-2 mb-1">
            {type === 'income' ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            )}
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", type === 'income' ? "text-emerald-700" : "text-rose-700")}>{title}</p>
        </div>
        <p className={cn("text-lg font-black tracking-tight", type === 'income' ? "text-emerald-600" : "text-rose-600")}>
            {value}
        </p>
    </div>
);

const ActionButton = ({ icon: Icon, label, variant = 'default', href, onClick }: { icon: React.ElementType, label: string, variant?: 'default' | 'destructive' | 'outline', href?: string, onClick?: () => void }) => {
    const variants = {
        default: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100',
        destructive: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100',
        outline: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
    };
    
    const content = (
        <Button onClick={onClick} className={cn("w-full justify-center h-12 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95", variants[variant])}>
            <Icon className="mr-2 h-4 w-4" />
            {label}
        </Button>
    );

    if (href) {
        return <Link href={href} className="w-full">{content}</Link>;
    }

    return content;
};

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const studentId = params.id;
  const supabase = createClient();
  
  // Ambil data siswa beserta SEMUA transaksi (termasuk dari kantin/kios)
  const { data: studentData, error } = await supabase
    .from('students')
    .select('*, transactions (*)')
    .eq('id', studentId)
    .limit(1)
    .single();

  if (error || !studentData) {
    return (
      <div className="text-center py-10">
        <p className='text-destructive font-semibold mb-2'>Siswa tidak ditemukan atau gagal memuat data.</p>
        <Button asChild variant="link">
          <Link href="/profiles">Kembali ke Daftar Siswa</Link>
        </Button>
      </div>
    );
  }

  const student = studentData as Student;
  // Urutkan transaksi terbaru di atas
  student.transactions = (student.transactions || []).sort((a,b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  const { income, expense, balance } = (student?.transactions || []).reduce(
    (acc, tx) => {
      if (tx.type === 'Pemasukan') {
        acc.income += tx.amount;
      } else {
        acc.expense += tx.amount;
      }
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  );
  
  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-muted-foreground hover:text-primary">
            <Link href="/profiles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Daftar Siswa
            </Link>
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Main Digital ID & Balance Card */}
      <Card className="bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-foreground shadow-2xl border-none relative overflow-hidden h-[260px] rounded-[2rem]">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none" />
        
        <CardContent className="p-8 relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
                <h1 className="text-2xl font-black tracking-tight leading-tight">{student.name}</h1>
                <div className="flex items-center gap-2 text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                    <span>NIS {student.nis}</span>
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span>Kelas {student.class}</span>
                </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Saldo Tabungan</p>
                <div className="h-px flex-1 bg-white/20" />
            </div>
            <p className="text-4xl font-black tracking-tighter drop-shadow-md">
              {balance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
            </p>
            <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] font-medium opacity-60 uppercase tracking-widest">
                    Update: {student.transactions[0] ? new Date(student.transactions[0].created_at!).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                </p>
                <div className="px-2 py-0.5 bg-white/10 rounded-full border border-white/10">
                    <p className="text-[8px] font-bold uppercase tracking-widest">Active Account</p>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatMiniCard title="Pemasukan" value={income.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })} type="income" />
        <StatMiniCard title="Pengeluaran" value={expense.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })} type="expense" />
      </div>

      {/* Action Sections */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 pt-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Transaksi Cepat</p>
            <div className="h-px flex-1 bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <ActionButton icon={PlusCircle} label="Setoran" href={`/profiles/${studentId}/deposit`} />
            <ActionButton icon={MinusCircle} label="Penarikan" variant="destructive" href={`/profiles/${studentId}/withdrawal`} />
        </div>
        
        <div className="flex items-center gap-2 px-1 pt-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Laporan & Berbagi</p>
            <div className="h-px flex-1 bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 gap-3">
            <PrintReportButton student={student} />
            <SendWAButton student={student} income={income} expense={expense} balance={balance} />
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="pt-6">
        <TransactionList initialTransactions={student.transactions} />
      </div>
    </div>
  );
}
