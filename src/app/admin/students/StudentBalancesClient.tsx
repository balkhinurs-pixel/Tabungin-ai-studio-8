'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Search, 
  Wallet, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  ArrowUpDown,
  Download,
  RotateCcw,
  GraduationCap,
  Receipt,
  ExternalLink,
  Eye,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Profile } from '@/types';

export interface AdminStudentBalanceItem {
  id: string;
  nis: string;
  name: string;
  class: string;
  user_id: string;
  school_name: string;
  school_email: string;
  balance: number;
  total_income: number;
  total_expense: number;
  transaction_count: number;
  transactions?: Array<{
    id: string;
    type: 'Pemasukan' | 'Pengeluaran';
    amount: number;
    category?: string;
    description?: string;
    created_at: string;
  }>;
}

interface StudentBalancesClientProps {
  initialStudents: AdminStudentBalanceItem[];
  teachers: Profile[];
  initialTeacherId?: string;
}

export default function StudentBalancesClient({
  initialStudents,
  teachers,
  initialTeacherId = 'all',
}: StudentBalancesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId);
  const [sortOption, setSortOption] = useState<'name_asc' | 'balance_desc' | 'balance_asc' | 'class_asc'>('name_asc');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<AdminStudentBalanceItem | null>(null);

  // Format currency IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered and Sorted Students
  const filteredStudents = useMemo(() => {
    return initialStudents
      .filter((student) => {
        // Filter by School / Teacher Account
        if (selectedTeacherId !== 'all' && student.user_id !== selectedTeacherId) {
          return false;
        }

        // Search term matching
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchName = student.name.toLowerCase().includes(q);
          const matchNis = (student.nis || '').toLowerCase().includes(q);
          const matchClass = (student.class || '').toLowerCase().includes(q);
          const matchSchool = student.school_name.toLowerCase().includes(q);
          if (!matchName && !matchNis && !matchClass && !matchSchool) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'balance_desc') {
          return b.balance - a.balance;
        }
        if (sortOption === 'balance_asc') {
          return a.balance - b.balance;
        }
        if (sortOption === 'class_asc') {
          return (a.class || '').localeCompare(b.class || '');
        }
        return a.name.localeCompare(b.name);
      });
  }, [initialStudents, selectedTeacherId, searchTerm, sortOption]);

  // Financial and Demographic Aggregates
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const totalBalance = filteredStudents.reduce((sum, s) => sum + s.balance, 0);
    const avgBalance = totalStudents > 0 ? Math.round(totalBalance / totalStudents) : 0;
    const uniqueSchools = new Set(filteredStudents.map((s) => s.user_id)).size;

    return {
      totalStudents,
      totalBalance,
      avgBalance,
      uniqueSchools,
    };
  }, [filteredStudents]);

  // Export simple CSV for accounting/audit
  const handleExportCSV = () => {
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Sekolah / Akun', 'Sisa Saldo (IDR)', 'Jumlah Transaksi'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.nis || '-'}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.class || '-'}"`,
      `"${s.school_name.replace(/"/g, '""')}"`,
      s.balance,
      s.transaction_count,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saldo_siswa_admin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Saldo Terkumpul */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Saldo Siswa
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600 font-mono tabular-nums">
              {formatIDR(stats.totalBalance)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Akumulasi saldo santri {selectedTeacherId !== 'all' ? 'sekolah ini' : 'seluruh sekolah'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Siswa */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Siswa Terdata
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {stats.totalStudents} <span className="text-sm font-medium text-muted-foreground">anak</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sesuai filter pencarian aktif
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Rata-Rata Saldo */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Rata-Rata Saldo
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {formatIDR(stats.avgBalance)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rata-rata tabungan per siswa
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Sekolah Terpantau */}
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sekolah Terpantau
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {stats.uniqueSchools} <span className="text-sm font-medium text-muted-foreground">instansi</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dari total {teachers.length} akun pengelola
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama siswa, NIS, kelas, atau nama sekolah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-background"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* School / Teacher Filter */}
            <div className="w-full sm:w-[220px]">
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="h-10 bg-background">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Semua Sekolah" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Semua Sekolah & Guru</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.school_name || t.email || 'Sekolah Tanpa Nama'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-[170px]">
              <Select value={sortOption} onValueChange={(val: any) => setSortOption(val)}>
                <SelectTrigger className="h-10 bg-background">
                  <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Urutan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Nama (A - Z)</SelectItem>
                  <SelectItem value="balance_desc">Saldo Tertinggi</SelectItem>
                  <SelectItem value="balance_asc">Saldo Terendah</SelectItem>
                  <SelectItem value="class_asc">Urut Berdasarkan Kelas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="default"
              onClick={handleExportCSV}
              className="h-10 font-bold shrink-0 gap-1.5"
              title="Unduh laporan saldo siswa dalam format CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Reset Filters */}
            {(searchTerm !== '' || selectedTeacherId !== 'all' || sortOption !== 'name_asc') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTeacherId('all');
                  setSortOption('name_asc');
                }}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                title="Reset filter"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <span>
            Menampilkan <strong className="text-foreground">{filteredStudents.length}</strong> dari{' '}
            {initialStudents.length} siswa
            {selectedTeacherId !== 'all' && (
              <>
                {' '}
                pada{' '}
                <strong className="text-primary">
                  {teachers.find((t) => t.id === selectedTeacherId)?.school_name || 'sekolah terpilih'}
                </strong>
              </>
            )}
          </span>
          {searchTerm && (
            <span>
              Kata kunci: &ldquo;<strong className="text-foreground">{searchTerm}</strong>&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Main Table: Sederhana & Bersih (NIS, Nama, Kelas, Nominal Saldo) */}
      <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">No</TableHead>
                <TableHead className="w-32 text-xs font-bold uppercase tracking-wider">NIS</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Nama Siswa</TableHead>
                <TableHead className="w-28 text-xs font-bold uppercase tracking-wider">Kelas</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Sekolah / Akun</TableHead>
                <TableHead className="w-36 text-right text-xs font-bold uppercase tracking-wider">Sisa Saldo</TableHead>
                <TableHead className="w-36 text-center text-xs font-bold uppercase tracking-wider">Aksi Transaksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-semibold text-sm">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-muted-foreground">
                        Coba sesuaikan kata kunci pencarian atau ubah filter sekolah di atas.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => {
                  const isPositive = student.balance > 0;
                  const isNegative = student.balance < 0;

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                      {/* 1. No */}
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {index + 1}
                      </TableCell>

                      {/* 2. NIS */}
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        {student.nis || '-'}
                      </TableCell>

                      {/* 3. Nama Siswa */}
                      <TableCell>
                        <div className="font-bold text-foreground text-sm tracking-tight">
                          {student.name}
                        </div>
                      </TableCell>

                      {/* 4. Kelas */}
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">
                          {student.class || '-'}
                        </span>
                      </TableCell>

                      {/* 5. Sekolah / Pengelola */}
                      <TableCell>
                        <div className="text-xs font-medium text-foreground truncate max-w-[200px]" title={student.school_name}>
                          {student.school_name}
                        </div>
                        {student.school_email && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {student.school_email}
                          </div>
                        )}
                      </TableCell>

                      {/* 6. Sisa Saldo (Nominal) */}
                      <TableCell className="text-right">
                        <span
                          className={`font-mono text-sm font-black tracking-tight tabular-nums ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isNegative
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatIDR(student.balance)}
                        </span>
                      </TableCell>

                      {/* 7. Aksi Transaksi */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedStudentForDetail(student)}
                            className="h-8 px-2.5 text-xs font-bold gap-1 shadow-xs"
                            title="Lihat rincian transaksi siswa ini"
                          >
                            <Receipt className="h-3.5 w-3.5 text-primary" />
                            <span>Riwayat</span>
                            <span className="text-[10px] bg-background text-muted-foreground px-1.5 py-0.2 rounded-full border">
                              {student.transaction_count}
                            </span>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Buka di halaman Transaksi Siswa"
                          >
                            <Link href={`/admin/transactions?studentId=${student.id}&studentName=${encodeURIComponent(student.name)}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
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
      </Card>

      {/* Detail Dialog: Transaksi Siswa */}
      <Dialog open={!!selectedStudentForDetail} onOpenChange={(open) => !open && setSelectedStudentForDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedStudentForDetail && (
            <>
              <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
                  <div>
                    <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      {selectedStudentForDetail.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      NIS: <span className="font-mono font-semibold text-foreground">{selectedStudentForDetail.nis || '-'}</span> | Kelas: <span className="font-medium text-foreground">{selectedStudentForDetail.class || '-'}</span> | Sekolah: <span className="font-medium text-foreground">{selectedStudentForDetail.school_name}</span>
                    </DialogDescription>
                  </div>
                </div>

                {/* Financial Summary Badges */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-background rounded-lg border p-2.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Sisa Saldo</span>
                    <span className={`text-base font-black font-mono tabular-nums ${selectedStudentForDetail.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatIDR(selectedStudentForDetail.balance)}
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border p-2.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Setoran</span>
                    <span className="text-base font-black font-mono tabular-nums text-emerald-600">
                      {formatIDR(selectedStudentForDetail.total_income)}
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border p-2.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Tarik/Jajan</span>
                    <span className="text-base font-black font-mono tabular-nums text-rose-600">
                      {formatIDR(selectedStudentForDetail.total_expense)}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Daftar Transaksi ({selectedStudentForDetail.transactions?.length || 0})</span>
                  <Link
                    href={`/admin/transactions?studentId=${selectedStudentForDetail.id}&studentName=${encodeURIComponent(selectedStudentForDetail.name)}`}
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    Buka Halaman Lengkap & Filter <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {(!selectedStudentForDetail.transactions || selectedStudentForDetail.transactions.length === 0) ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border rounded-xl bg-muted/10">
                    <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    Belum ada riwayat transaksi tercatat untuk siswa ini.
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-muted/40 text-[11px]">
                        <TableRow>
                          <TableHead className="w-32 py-2">Waktu</TableHead>
                          <TableHead className="w-24 py-2">Tipe</TableHead>
                          <TableHead className="py-2">Kategori & Keterangan</TableHead>
                          <TableHead className="w-28 text-right py-2">Nominal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStudentForDetail.transactions.map((tx) => {
                          const isIncome = tx.type === 'Pemasukan';
                          const txDate = tx.created_at ? new Date(tx.created_at) : new Date();

                          return (
                            <TableRow key={tx.id} className="text-xs">
                              <TableCell className="font-mono text-[11px] text-muted-foreground py-2.5">
                                {format(txDate, 'dd/MM/yyyy HH:mm', { locale: idLocale })}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0 font-bold ${
                                    isIncome
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}
                                >
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className="font-semibold text-foreground text-xs">
                                  {tx.category || 'Umum'}
                                </div>
                                {tx.description && (
                                  <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                    {tx.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold py-2.5 tabular-nums">
                                <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                                  {isIncome ? '+' : '-'} {formatIDR(tx.amount)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Admin Pusat memiliki wewenang untuk mengedit atau menghapus data transaksi jika diperlukan.
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudentForDetail(null)}
                    className="flex-1 sm:flex-none font-bold"
                  >
                    Tutup
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 sm:flex-none gap-1.5 font-bold"
                  >
                    <Link href={`/admin/transactions?studentId=${selectedStudentForDetail.id}&studentName=${encodeURIComponent(selectedStudentForDetail.name)}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Kelola Transaksi Siswa
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
