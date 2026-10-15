'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Wallet, 
  Building2, 
  Users, 
  TrendingUp, 
  ArrowUpDown,
  Download,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
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
                <TableHead className="w-40 text-right text-xs font-bold uppercase tracking-wider">Sisa Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
