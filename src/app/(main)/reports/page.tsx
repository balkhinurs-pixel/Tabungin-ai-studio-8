
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { Student } from '@/types';
import { createClient } from '@/lib/utils/supabase/server';
import FilterControls from './_components/FilterControls';

interface ReportRow {
  nis: string;
  name: string;
  class: string;
  income: number;
  outcome: number;
  balance: number;
}

interface ReportsPageProps {
    searchParams: {
        from?: string;
        to?: string;
        class?: string;
    }
}

async function ReportsData({ searchParams }: ReportsPageProps) {
    const supabase = createClient();
    const { from, to, class: selectedClass = 'all' } = searchParams;
    
    // Ambil semua siswa guru ini beserta seluruh transaksinya (terlepas siapa penginputnya)
    let studentsQuery = supabase
        .from('students')
        .select(`
            id, nis, name, class,
            transactions (
                type,
                amount,
                created_at
            )
        `);

    if (selectedClass !== 'all') {
        studentsQuery = studentsQuery.eq('class', selectedClass);
    }
    
    const { data: students, error } = await studentsQuery;

    if (error) {
        return <p className="text-destructive text-center">Gagal memuat data: {error.message}</p>
    }

    const reportData: ReportRow[] = (students as Student[]).map(student => {
        // Filter transaksi berdasarkan rentang tanggal
        const filteredTxs = (student.transactions || []).filter(tx => {
            const txDate = new Date(tx.created_at!).getTime();
            const fromDate = from ? new Date(from).getTime() : 0;
            const toDate = to ? new Date(to).setHours(23, 59, 59, 999) : Date.now();
            return txDate >= fromDate && txDate <= toDate;
        });

        const { income, expense } = filteredTxs.reduce(
            (acc, tx) => {
                if (tx.type === 'Pemasukan') acc.income += tx.amount;
                else acc.expense += tx.amount;
                return acc;
            },
            { income: 0, expense: 0 }
        );

        return {
            nis: student.nis,
            name: student.name,
            class: student.class,
            income,
            outcome: expense,
            balance: income - expense,
        };
    }).filter(data => data.income > 0 || data.outcome > 0);


    const { totalIncome, totalOutcome, totalBalance } = reportData.reduce(
        (acc, item) => {
            acc.totalIncome += item.income;
            acc.totalOutcome += item.outcome;
            acc.totalBalance += item.balance;
            return acc;
        },
        { totalIncome: 0, totalOutcome: 0, totalBalance: 0 }
    );

    const period = from ? `${format(new Date(from), 'd MMM yyyy')} - ${to ? format(new Date(to), 'd MMM yyyy') : 'Sekarang'}` : 'Semua Periode';

    return (
        <div className="space-y-6">
            <FilterControls reportData={reportData} period={period} totals={{ totalIncome, totalOutcome, totalBalance }} />
            
             <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">NO</TableHead>
                            <TableHead>NIS</TableHead>
                            <TableHead>NAMA SISWA</TableHead>
                            <TableHead>KELAS</TableHead>
                            <TableHead className="text-right">PEMASUKAN (RP)</TableHead>
                            <TableHead className="text-right">PENGELUARAN (RP)</TableHead>
                            <TableHead className="text-right font-bold">SALDO AKHIR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.length > 0 ? reportData.map((item, index) => (
                            <TableRow key={item.nis}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell>{item.nis}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.class}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">{item.income.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right font-medium text-red-600">{item.outcome.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right font-bold">{item.balance.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    Tidak ada data untuk ditampilkan pada filter ini.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-bold text-center">GRAND TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{totalIncome.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">{totalOutcome.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-bold">{totalBalance.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    )
}


export default function ReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-bold tracking-tight">Laporan Tabungan Siswa</h2>
      </div>

      <Suspense fallback={<div className="text-center text-muted-foreground py-10">Memuat laporan...</div>}>
        <ReportsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
