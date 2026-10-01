'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { 
  Pencil, 
  Trash2, 
  Search, 
  Loader2, 
  Save, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Wallet,
  Building2,
  Calendar,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, isToday, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { updateTransactionByAdmin, deleteTransactionByAdmin } from './actions';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

export interface AdminTransactionItem {
  id: string;
  amount: number;
  description: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category?: string;
  is_settled?: boolean;
  created_at: string;
  user_id?: string;
  student_id: string;
  student?: {
    id: string;
    nis: string;
    name: string;
    class: string;
    user_id: string;
  } | null;
  teacherEmail?: string;
  teacherSchoolName?: string;
}

interface AdminTransactionsClientProps {
  initialTransactions: AdminTransactionItem[];
  teachers: Profile[];
  initialSelectedTeacherId?: string;
}

export default function AdminTransactionsClient({
  initialTransactions,
  teachers,
  initialSelectedTeacherId = 'all',
}: AdminTransactionsClientProps) {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>(initialTransactions);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialSelectedTeacherId);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Pemasukan' | 'Pengeluaran'>('all');
  const [filterTimeRange, setFilterTimeRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Edit State
  const [editingTx, setEditingTx] = useState<AdminTransactionItem | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editType, setEditType] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('TABUNGAN');
  const [editLoading, setEditLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Delete State
  const [deletingTx, setDeletingTx] = useState<AdminTransactionItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { toast } = useToast();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Teacher filter
      if (selectedTeacherId !== 'all') {
        const txOwner = tx.student?.user_id || tx.user_id;
        if (txOwner !== selectedTeacherId) return false;
      }

      // Type filter
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'all') {
        const cat = tx.category || 'TABUNGAN';
        if (cat !== filterCategory) return false;
      }

      // Time range filter
      if (filterTimeRange !== 'all') {
        const txDate = new Date(tx.created_at);
        if (filterTimeRange === 'today') {
          if (!isToday(txDate)) return false;
        } else if (filterTimeRange === '7days') {
          if (txDate < subDays(new Date(), 7)) return false;
        } else if (filterTimeRange === '30days') {
          if (txDate < subDays(new Date(), 30)) return false;
        }
      }

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const studentName = tx.student?.name?.toLowerCase() || '';
        const studentNis = tx.student?.nis?.toLowerCase() || '';
        const studentClass = tx.student?.class?.toLowerCase() || '';
        const desc = tx.description?.toLowerCase() || '';
        const email = tx.teacherEmail?.toLowerCase() || '';
        const school = tx.teacherSchoolName?.toLowerCase() || '';

        const match =
          studentName.includes(q) ||
          studentNis.includes(q) ||
          studentClass.includes(q) ||
          desc.includes(q) ||
          email.includes(q) ||
          school.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [transactions, selectedTeacherId, filterType, filterCategory, filterTimeRange, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'Pemasukan') {
        income += Number(tx.amount) || 0;
      } else {
        expense += Number(tx.amount) || 0;
      }
    });
    return {
      totalCount: filteredTransactions.length,
      income,
      expense,
      balance: income - expense,
    };
  }, [filteredTransactions]);

  const handleOpenEdit = (tx: AdminTransactionItem) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditType(tx.type);
    setEditDescription(tx.description || '');
    setEditCategory(tx.category || 'TABUNGAN');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast({
        title: 'Nominal Tidak Valid',
        description: 'Masukkan angka nominal transaksi yang benar.',
        variant: 'destructive',
      });
      return;
    }

    setEditLoading(true);
    const result = await updateTransactionByAdmin(editingTx.id, {
      amount: numAmount,
      type: editType,
      description: editDescription.trim(),
      category: editCategory,
    });

    if (result.success) {
      toast({ title: 'Berhasil', description: result.message });
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTx.id
            ? {
                ...t,
                amount: numAmount,
                type: editType,
                description: editDescription.trim(),
                category: editCategory,
              }
            : t
        )
      );
      setIsEditDialogOpen(false);
    } else {
      toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setEditLoading(false);
  };

  const handleOpenDelete = (tx: AdminTransactionItem) => {
    setDeletingTx(tx);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setDeleteLoading(true);
    const result = await deleteTransactionByAdmin(deletingTx.id);

    if (result.success) {
      toast({ title: 'Berhasil Dihapus', description: result.message });
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
      setIsDeleteDialogOpen(false);
    } else {
      toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setDeleteLoading(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* School / Teacher Dropdown */}
            <div className="flex-1 min-w-[260px] space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Pilih Akun Guru / Sekolah Terdaftar:
              </Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="h-10 font-medium">
                  <SelectValue placeholder="Semua Akun Guru / Sekolah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-semibold">
                    ★ Semua Sekolah & Guru ({teachers.length} Akun)
                  </SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.school_name ? `${t.school_name} — ` : ''}{t.email} ({t.role || 'GURU'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="w-full md:w-48 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Periode Waktu:
              </Label>
              <Select value={filterTimeRange} onValueChange={(v: any) => setFilterTimeRange(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="7days">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30days">30 Hari Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-44 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Jenis Aliran:
              </Label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Pemasukan">Pemasukan (+)</SelectItem>
                  <SelectItem value="Pengeluaran">Pengeluaran (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Kategori:
              </Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="TABUNGAN">Tabungan Standar</SelectItem>
                  <SelectItem value="BELANJA_KANTIN">Kantin Sekolah</SelectItem>
                  <SelectItem value="TARIK_TUNAI">Tarik Tunai</SelectItem>
                  <SelectItem value="BELANJA_JASTIP">Jastip / Toko</SelectItem>
                  <SelectItem value="BIAYA_ADMIN">Biaya Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan nama santri, NIS, kelas, keterangan transaksi, atau email guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                onClick={() => setSearchQuery('')}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Data Transaksi</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.totalCount}</p>
              <p className="text-[11px] text-muted-foreground">Baris terpantau</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase">Total Pemasukan</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.income)}</p>
              <p className="text-[11px] text-muted-foreground">Setoran tabungan dll</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase">Total Pengeluaran</p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{formatCurrency(stats.expense)}</p>
              <p className="text-[11px] text-muted-foreground">Tarik & jajan kantin</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary uppercase">Saldo Bersih</p>
              <p className={cn("text-xl sm:text-2xl font-black mt-1", stats.balance >= 0 ? "text-primary" : "text-rose-600")}>
                {formatCurrency(stats.balance)}
              </p>
              <p className="text-[11px] text-muted-foreground">Arus kas bersih</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Daftar Transaksi Sekolah / Guru</h2>
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredTransactions.length} dari total {transactions.length} transaksi yang tercatat di sistem pusat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              Mode: Super Admin (Read & Write)
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[140px]">Waktu / Tanggal</TableHead>
                <TableHead>Akun Guru / Sekolah</TableHead>
                <TableHead>Santri / Siswa</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-center w-[110px]">Aksi Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-semibold text-sm">Tidak ada transaksi yang cocok dengan kriteria filter.</p>
                      <p className="text-xs text-muted-foreground">Coba ubah filter atau kata kunci pencarian Anda.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const txDate = tx.created_at ? parseISO(tx.created_at) : new Date();
                  const isIncome = tx.type === 'Pemasukan';

                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors">
                      {/* Date & Time */}
                      <TableCell className="font-mono text-xs">
                        <div className="font-semibold text-foreground">
                          {format(txDate, 'dd MMM yyyy', { locale: idLocale })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {format(txDate, 'HH:mm:ss')} WIB
                        </div>
                      </TableCell>

                      {/* Teacher / School */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground">
                            {tx.teacherSchoolName || tx.teacherEmail || 'Akun Guru'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {tx.teacherEmail}
                          </span>
                        </div>
                      </TableCell>

                      {/* Student */}
                      <TableCell>
                        {tx.student ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-foreground">{tx.student.name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              NIS: {tx.student.nis} • Kelas {tx.student.class}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">(Data santri terhapus)</span>
                        )}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wide uppercase">
                          {tx.category?.replace('_', ' ') || 'TABUNGAN'}
                        </Badge>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-extrabold uppercase border-none',
                            isIncome
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>

                      {/* Amount */}
                      <TableCell
                        className={cn(
                          'text-right font-black font-mono text-sm',
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(Number(tx.amount))}
                      </TableCell>

                      {/* Description */}
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-foreground truncate" title={tx.description}>
                          {tx.description || '-'}
                        </p>
                      </TableCell>

                      {/* Admin Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit Transaksi Ini (Admin)"
                            onClick={() => handleOpenEdit(tx)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Hapus Transaksi (Admin)"
                            onClick={() => handleOpenDelete(tx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Transaksi Guru (Hak Admin Pusat)
            </DialogTitle>
            <DialogDescription>
              Ubah rincian transaksi santri{' '}
              <strong className="text-foreground">{editingTx?.student?.name}</strong> (NIS:{' '}
              {editingTx?.student?.nis}). Perubahan akan langsung disinkronkan ke saldo santri.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Jenis Aliran Dana</Label>
              <Select value={editType} onValueChange={(v: any) => setEditType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pemasukan">Pemasukan (Menambah Saldo Santri)</SelectItem>
                  <SelectItem value="Pengeluaran">Pengeluaran (Mengurangi Saldo Santri)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nominal Transaksi (Rp)</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                placeholder="Contoh: 50000"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground font-mono">
                Format: {formatCurrency(parseFloat(editAmount) || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Kategori Transaksi</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TABUNGAN">TABUNGAN (Setoran / Tarik Tabungan)</SelectItem>
                  <SelectItem value="BELANJA_KANTIN">BELANJA KANTIN</SelectItem>
                  <SelectItem value="TARIK_TUNAI">TARIK TUNAI</SelectItem>
                  <SelectItem value="BELANJA_JASTIP">BELANJA JASTIP / TOKO</SelectItem>
                  <SelectItem value="BIAYA_ADMIN">BIAYA ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Keterangan / Catatan Transaksi</Label>
              <Input
                placeholder="Misal: Koreksi setoran tabungan oleh Admin Pusat"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Hapus Transaksi Ini?
            </DialogTitle>
            <DialogDescription>
              Anda akan menghapus transaksi{' '}
              <strong className="text-foreground">"{deletingTx?.description}"</strong> sebesar{' '}
              <strong className="text-foreground">{formatCurrency(deletingTx?.amount || 0)}</strong> milik santri{' '}
              <strong>{deletingTx?.student?.name}</strong>. Tindakan ini akan mengembalikan/menyesuaikan ulang saldo santri secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Ya, Hapus Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
