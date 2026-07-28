
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { Trash2, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Transaction } from '@/types';

const DeleteTransactionDialog = ({ transactionId, description, onDelete }: { transactionId: string, description: string, onDelete: (id: string) => void }) => {
    const { toast } = useToast();
    const supabase = createClient();

    const handleDelete = async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
        
        if (error) {
             toast({
                title: 'Gagal Menghapus Transaksi',
                description: error.message,
                variant: 'destructive',
            });
        } else {
            onDelete(transactionId);
            toast({
                title: 'Transaksi Dihapus',
                description: `Transaksi "${description}" telah dihapus.`,
            });
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 border-rose-200 text-rose-500 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus Transaksi?</DialogTitle>
                    <DialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus transaksi "{description}"?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Batal</Button></DialogClose>
                    <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface TransactionListProps {
    initialTransactions: Transaction[];
    isStudentView?: boolean;
}

export default function TransactionList({ initialTransactions, isStudentView = false }: TransactionListProps) {
    const [transactions, setTransactions] = useState(initialTransactions);

    const handleDeleteTransaction = (transactionId: string) => {
        setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    };

    const tableHeaders = isStudentView
        ? ['TANGGAL', 'JENIS', 'KETERANGAN', 'JUMLAH']
        : ['TANGGAL', 'JENIS', 'KETERANGAN', 'JUMLAH', 'AKSI'];

    return (
         <Card className="shadow-lg border-none">
          <CardHeader>
              <CardTitle className="text-lg font-black tracking-tight">Riwayat Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
                <Table className="whitespace-nowrap">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-2">
                            {tableHeaders.map((header, index) => (
                                <TableHead 
                                    key={index}
                                    className={cn(
                                        "text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4",
                                        (header === 'JUMLAH' || header === 'AKSI') && 'text-center',
                                        header === 'JUMLAH' && 'text-right'
                                    )}
                                >
                                    {header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={tableHeaders.length} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Lock className="h-8 w-8" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Belum ada riwayat</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {transactions.map((tx) => {
                            // Cek apakah transaksi bersifat sistem (tidak boleh dihapus)
                            const isSystemTransaction = tx.category === 'BELANJA_KANTIN' || tx.category === 'TARIK_TUNAI';
                            
                            return (
                                <TableRow key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="text-[11px] font-bold text-gray-500">
                                        {tx.created_at ? format(parseISO(tx.created_at), 'dd/MM/yy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={tx.type === 'Pemasukan' ? 'default' : 'destructive'} className={cn("text-[9px] font-black px-2 py-0 border-none", tx.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                            {tx.type.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">{tx.description}</span>
                                            {isSystemTransaction && (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-primary/50">Otomatis • {tx.category?.replace('_', ' ')}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn("text-right font-black text-sm", tx.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600')}>
                                        {tx.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                                    </TableCell>
                                    {!isStudentView && (
                                        <TableCell className="text-center">
                                            {!isSystemTransaction ? (
                                                <DeleteTransactionDialog 
                                                    transactionId={tx.id}
                                                    description={tx.description}
                                                    onDelete={handleDeleteTransaction}
                                                />
                                            ) : (
                                                <div className="flex justify-center" title="Transaksi sistem tidak dapat dihapus">
                                                    <div className="bg-gray-100 p-1.5 rounded-full">
                                                        <Lock className="h-3.5 w-3.5 text-gray-400" />
                                                    </div>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
      </Card>
    )
}
