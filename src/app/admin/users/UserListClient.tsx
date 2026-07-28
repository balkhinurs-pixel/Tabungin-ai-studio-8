
'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Loader2, Save } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateUserByAdmin } from './actions';

interface UserListClientProps {
  initialUsers: Profile[];
}

export default function UserListClient({ initialUsers }: UserListClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [editPlan, setEditPlan] = useState<'TRIAL' | 'PRO'>('TRIAL');
  const [editQuota, setEditQuota] = useState<string>('');

  const handleEditClick = (user: Profile) => {
    setSelectedUser(user);
    setEditPlan(user.plan);
    setEditQuota(user.custom_quota?.toString() || '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setLoading(true);

    const result = await updateUserByAdmin(selectedUser.id, {
      plan: editPlan,
      custom_quota: editQuota ? parseInt(editQuota) : null
    });

    if (result.success) {
      toast({ title: 'Berhasil', description: result.message });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, plan: editPlan, custom_quota: editQuota ? parseInt(editQuota) : null } : u));
      setOpen(false);
    } else {
      toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Kuota Aktif</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={user.plan === 'PRO' ? 'bg-emerald-100 text-emerald-700' : ''}>
                    {user.plan}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">
                  {user.custom_quota || (user.plan === 'PRO' ? 40 : 5)} Siswa
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'outline'}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>Sesuaikan plan dan kuota siswa untuk {selectedUser?.email}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Plan Akun</Label>
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
            <div className="space-y-2">
              <Label>Kuota Kustom (Opsional)</Label>
              <Input 
                type="number" 
                placeholder="Misal: 100" 
                value={editQuota} 
                onChange={(e) => setEditQuota(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Kosongkan untuk menggunakan kuota default plan.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Batal</Button></DialogClose>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
