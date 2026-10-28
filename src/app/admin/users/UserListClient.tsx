'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Loader2,
  Save,
  Receipt,
  CheckCircle2,
  XCircle,
  Phone,
  School,
  User,
  Search,
  MessageCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Filter,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateUserByAdmin, approveUserAction, rejectUserAction } from './actions';

interface UserListClientProps {
  initialUsers: Profile[];
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function UserListClient({ initialUsers }: UserListClientProps) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  const { toast } = useToast();

  const [editPlan, setEditPlan] = useState<'TRIAL' | 'PRO'>('TRIAL');
  const [editQuota, setEditQuota] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('APPROVED');
  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>('');

  // Hitung jumlah status
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    users.forEach((u) => {
      const status = u.approval_status || (u.role === 'ADMIN' ? 'APPROVED' : 'PENDING');
      if (status === 'PENDING') pending++;
      else if (status === 'APPROVED') approved++;
      else if (status === 'REJECTED') rejected++;
    });

    return { total: users.length, pending, approved, rejected };
  }, [users]);

  // Filter daftar pengguna
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const userStatus = user.approval_status || (user.role === 'ADMIN' ? 'APPROVED' : 'PENDING');

      // Filter status
      if (statusFilter !== 'ALL' && userStatus !== statusFilter) {
        return false;
      }

      // Filter query pencarian
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (user.full_name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const school = (user.school_name || '').toLowerCase();
      const phone = (user.phone_number || '').toLowerCase();

      return name.includes(q) || email.includes(q) || school.includes(q) || phone.includes(q);
    });
  }, [users, statusFilter, searchQuery]);

  const handleEditClick = (user: Profile) => {
    setSelectedUser(user);
    setEditPlan(user.plan || 'TRIAL');
    setEditQuota(user.custom_quota?.toString() || '');
    setEditStatus((user.approval_status as any) || (user.role === 'ADMIN' ? 'APPROVED' : 'PENDING'));
    setEditFullName(user.full_name || '');
    setEditPhoneNumber(user.phone_number || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setLoading(true);

    const result = await updateUserByAdmin(selectedUser.id, {
      plan: editPlan,
      custom_quota: editQuota ? parseInt(editQuota) : null,
      approval_status: editStatus,
      full_name: editFullName || null,
      phone_number: editPhoneNumber || null,
    });

    if (result.success) {
      toast({ title: 'Berhasil', description: result.message });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                plan: editPlan,
                custom_quota: editQuota ? parseInt(editQuota) : null,
                approval_status: editStatus,
                full_name: editFullName || null,
                phone_number: editPhoneNumber || null,
              }
            : u
        )
      );
      setOpen(false);
    } else {
      toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleDirectApprove = async (userId: string, userName: string) => {
    setActionLoadingId(userId);
    const result = await approveUserAction(userId);
    if (result.success) {
      toast({
        title: 'Akun Disetujui',
        description: `Akun guru ${userName || 'ini'} berhasil disetujui. Guru sekarang dapat login dan mengakses dashboard.`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, approval_status: 'APPROVED' } : u))
      );
    } else {
      toast({ title: 'Gagal Menyetujui', description: result.message, variant: 'destructive' });
    }
    setActionLoadingId(null);
  };

  const handleDirectReject = async (userId: string, userName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menolak pendaftaran akun guru ${userName || 'ini'}?`)) {
      return;
    }
    setActionLoadingId(userId);
    const result = await rejectUserAction(userId);
    if (result.success) {
      toast({
        title: 'Akun Ditolak',
        description: `Pendaftaran akun ${userName || 'ini'} telah ditolak.`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, approval_status: 'REJECTED' } : u))
      );
    } else {
      toast({ title: 'Gagal Menolak', description: result.message, variant: 'destructive' });
    }
    setActionLoadingId(null);
  };

  // Helper WhatsApp url
  const getWhatsAppLink = (phone?: string | null, name?: string | null, school?: string | null) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;

    const text = `Halo Bapak/Ibu ${name || 'Guru'} dari ${school || 'Sekolah'}, kami dari Admin Pusat Tabungin...`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            statusFilter === 'ALL'
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Guru</span>
            <User className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold">{counts.total}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10'
              : counts.pending > 0
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Butuh Approval
            </span>
            {counts.pending > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.pending}</p>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Disetujui
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{counts.approved}</p>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-destructive ring-2 ring-destructive/20 bg-destructive/10'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between text-destructive mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Ditolak
            </span>
          </div>
          <p className="text-2xl font-bold text-destructive">{counts.rejected}</p>
        </div>
      </div>

      {/* Bar Pencarian & Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama guru, email, sekolah, nomor kontak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60 overflow-x-auto">
          <Button
            variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className="text-xs h-8"
          >
            Semua ({counts.total})
          </Button>
          <Button
            variant={statusFilter === 'PENDING' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
            className={`text-xs h-8 ${statusFilter === 'PENDING' ? 'text-amber-700 font-bold' : ''}`}
          >
            Pending ({counts.pending})
          </Button>
          <Button
            variant={statusFilter === 'APPROVED' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('APPROVED')}
            className="text-xs h-8"
          >
            Disetujui ({counts.approved})
          </Button>
          <Button
            variant={statusFilter === 'REJECTED' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('REJECTED')}
            className="text-xs h-8"
          >
            Ditolak ({counts.rejected})
          </Button>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[280px]">Guru & Akun</TableHead>
              <TableHead>Sekolah & Kontak</TableHead>
              <TableHead>Status Persetujuan</TableHead>
              <TableHead>Plan & Kuota</TableHead>
              <TableHead className="text-right">Aksi & Persetujuan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Tidak ada data pengguna yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const status = user.approval_status || (user.role === 'ADMIN' ? 'APPROVED' : 'PENDING');
                const isPending = status === 'PENDING';
                const isApproved = status === 'APPROVED';
                const isRejected = status === 'REJECTED';
                const isSuperAdmin = user.role === 'ADMIN' || user.email?.toLowerCase() === 'balkhinurs@gmail.com';
                const waLink = getWhatsAppLink(user.phone_number, user.full_name, user.school_name);
                const isActing = actionLoadingId === user.id;

                return (
                  <TableRow key={user.id} className={isPending ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                    {/* Guru & Akun */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {user.full_name || <span className="text-muted-foreground italic">Nama belum diisi</span>}
                          </span>
                          {isSuperAdmin && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4">
                              SUPER ADMIN
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>

                    {/* Sekolah & Kontak */}
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{user.school_name || <span className="text-muted-foreground italic">Belum disetel</span>}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            {user.phone_number || <span className="italic">Tidak ada no. WA</span>}
                          </span>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              Chat WA
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Persetujuan */}
                    <TableCell>
                      {isPending ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-fit"
                        >
                          <Clock className="h-3 w-3" /> Menunggu Persetujuan
                        </Badge>
                      ) : isApproved ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Disetujui
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 flex items-center gap-1 w-fit"
                        >
                          <XCircle className="h-3 w-3" /> Ditolak
                        </Badge>
                      )}
                    </TableCell>

                    {/* Plan & Kuota */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={user.plan === 'PRO' ? 'bg-emerald-100 text-emerald-700' : ''}>
                            {user.plan || 'TRIAL'}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          Kuota: <strong className="text-foreground">{user.custom_quota || (user.plan === 'PRO' ? 40 : 5)}</strong> Siswa
                        </span>
                      </div>
                    </TableCell>

                    {/* Aksi & Persetujuan */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && !isSuperAdmin && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-semibold"
                              onClick={() => handleDirectApprove(user.id, user.full_name || user.email || '')}
                              disabled={isActing}
                              title="Setujui Akun Guru Ini"
                            >
                              {isActing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Setujui
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 border-destructive/30 h-8 px-2 text-xs"
                              onClick={() => handleDirectReject(user.id, user.full_name || user.email || '')}
                              disabled={isActing}
                              title="Tolak Pendaftaran"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title="Lihat & Pantau Transaksi Akun Ini"
                        >
                          <Link href={`/admin/transactions?userId=${user.id}`}>
                            <Receipt className="h-4 w-4 text-emerald-600" />
                          </Link>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(user)}
                          title="Edit Lengkap Profil, Plan & Status"
                        >
                          <Pencil className="h-4 w-4" />
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

      {/* Dialog Edit Profil, Plan, dan Status Persetujuan */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Akun Pengguna</DialogTitle>
            <DialogDescription>
              Ubah data profil, status persetujuan, plan, dan kuota untuk <strong>{selectedUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Lengkap Guru</Label>
              <Input
                placeholder="Nama Lengkap"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>

            {/* Nomor Telepon / WA */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nomor WhatsApp / Kontak</Label>
              <Input
                placeholder="Contoh: 081234567890"
                value={editPhoneNumber}
                onChange={(e) => setEditPhoneNumber(e.target.value)}
              />
            </div>

            {/* Status Persetujuan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Persetujuan Akun</Label>
              <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Disetujui (APPROVED) - Bisa Akses</SelectItem>
                  <SelectItem value="PENDING">Menunggu (PENDING) - Terkunci</SelectItem>
                  <SelectItem value="REJECTED">Ditolak (REJECTED) - Diblokir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Akun */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plan Akun</Label>
              <Select value={editPlan} onValueChange={(v: any) => setEditPlan(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">TRIAL (Default 5 Siswa)</SelectItem>
                  <SelectItem value="PRO">PRO (Default 40 Siswa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kuota Kustom */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kuota Siswa Kustom (Opsional)</Label>
              <Input
                type="number"
                placeholder="Misal: 100"
                value={editQuota}
                onChange={(e) => setEditQuota(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Kosongkan untuk menggunakan kuota default plan.</p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Batal</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
