'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
  } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, Download, Upload, Filter, Search, ShieldCheck, User, KeyRound, Pencil, Trash2, Save, Loader2, Info, ArrowRight, RotateCcw, SortAsc, X, Archive, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Student, Profile } from '@/types';
import type { AuthUser } from '@supabase/supabase-js';
import { Alert, AlertDescription } from '@/components/ui/alert';

// These types define the shape of the Server Actions that will be passed as props.
type BoundAddStudentAction = (formData: FormData) => Promise<{success: boolean; message: string; student?: Student;}>;
type BoundUpdateStudentAction = (formData: FormData) => Promise<{success: boolean; message: string; student?: Student;}>;
type BoundDeleteStudentAction = (studentId: string) => Promise<{success: boolean; message: string;}>;
type BoundImportStudentsAction = (csvContent: string) => Promise<{success: boolean; message: string; importedCount: number; newStudents: Student[]}>;
type BoundArchiveStudentAction = (studentId: string) => Promise<{success: boolean; message: string;}>;
type BoundRestoreStudentAction = (studentId: string) => Promise<{success: boolean; message: string;}>;


interface ProfilesClientPageProps {
    initialStudents: Student[];
    initialProfile: Profile | null;
    initialUser: AuthUser | null;
    addStudentAction: BoundAddStudentAction;
    updateStudentAction: BoundUpdateStudentAction;
    deleteStudentAction: BoundDeleteStudentAction;
    importStudentsAction: BoundImportStudentsAction;
    archiveStudentAction: BoundArchiveStudentAction;
    restoreStudentAction: BoundRestoreStudentAction;
}

const EditStudentDialog = ({ 
    student, 
    onStudentUpdated, 
    updateStudentAction,
    archiveStudentAction,
    onStudentArchived
}: { 
    student: Student; 
    onStudentUpdated: (updatedStudent: Student) => void; 
    updateStudentAction: BoundUpdateStudentAction;
    archiveStudentAction: BoundArchiveStudentAction;
    onStudentArchived: (studentId: string, updatedNisSuffix: string, updatedName: string) => void;
}) => {
    const { toast } = useToast();
    
    const [nis, setNis] = useState(student?.nis || '');
    const [name, setName] = useState(student?.name || '');
    const [studentClass, setStudentClass] = useState(student?.class || '');
    const [whatsappNumber, setWhatsappNumber] = useState(student?.whatsapp_number || '');
    const [pin, setPin] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (student && open) {
            setNis(student.nis);
            setName(student.name);
            setStudentClass(student.class);
            setWhatsappNumber(student.whatsapp_number || '');
            setPin('');
            setShowArchiveConfirm(false);
        }
    }, [student, open]);

    const handleSubmit = async (formData: FormData) => {
        if (pin && pin.length !== 6) {
            toast({
                title: 'PIN Tidak Valid',
                description: 'PIN harus terdiri dari tepat 6 digit angka.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        const result = await updateStudentAction(formData);
        setLoading(false);

        if (result.success && result.student) {
            onStudentUpdated(result.student);
            toast({
                title: 'Siswa Diperbarui',
                description: result.message,
            });
            setOpen(false);
        } else {
             toast({
                title: 'Gagal Memperbarui Siswa',
                description: result.message,
                variant: 'destructive',
            });
        }
    }

    const handleArchiveDirect = async () => {
        setArchiveLoading(true);
        const result = await archiveStudentAction(student.id);
        setArchiveLoading(false);

        if (result.success) {
            const timestamp = Math.floor(Date.now() / 1000);
            onStudentArchived(student.id, `_arc_${timestamp}`, `${student.name} (Diarsipkan)`);
            toast({
                title: 'Siswa Diarsipkan',
                description: result.message,
            });
            setOpen(false);
        } else {
            toast({
                title: 'Gagal Mengarsipkan',
                description: result.message,
                variant: 'destructive',
            });
        }
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPin(value);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className='h-8 w-8 border-yellow-500 text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600' title="Ubah Profil">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form action={handleSubmit} ref={formRef}>
                <DialogHeader>
                    <DialogTitle>Ubah Profil Siswa</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                    <input type="hidden" name="id" value={student.id} />
                    <div className="space-y-2">
                        <Label htmlFor="edit-nis">NIS (Nomor Induk Siswa)</Label>
                        <Input id="edit-nis" name="nis" value={nis} onChange={(e) => setNis(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-fullName">Nama Lengkap</Label>
                        <Input id="edit-fullName" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-class">Kelas</Label>
                        <Input id="edit-class" name="class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-whatsapp">Nomor WhatsApp Wali (Opsional)</Label>
                        <Input id="edit-whatsapp" name="whatsapp_number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Contoh: 6281234567890" />
                    </div>
                    <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-pin">PIN Siswa (6 Digit Angka)</Label>
                            <Button 
                                type="button" 
                                variant="link" 
                                className="h-auto p-0 text-[10px] font-bold text-primary"
                                onClick={() => setPin('123456')}
                            >
                                <RotateCcw className="mr-1 h-3 w-3" /> Gunakan 123456
                            </Button>
                        </div>
                        <Input 
                            id="edit-pin" 
                            name="pin" 
                            value={pin} 
                            onChange={handlePinChange} 
                            placeholder="Biarkan kosong jika tidak diubah" 
                            maxLength={6}
                            inputMode="numeric"
                        />
                         <Alert variant="default" className="mt-2 text-blue-800 bg-blue-50 border-blue-200">
                           <Info className="h-4 w-4 !text-blue-800" />
                           <AlertDescription>
                            Isi hanya jika Anda ingin mereset PIN siswa. Biarkan kosong untuk tetap menggunakan PIN lama.
                           </AlertDescription>
                        </Alert>
                    </div>

                    {showArchiveConfirm ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2 text-sm text-blue-950">
                            <p className="font-semibold text-xs uppercase tracking-wider text-blue-800">Konfirmasi Pengarsipan</p>
                            <p className="text-xs">
                                Mengarsipkan <strong>{student.name}</strong> akan membebaskan NIS aslinya agar dapat digunakan siswa lain, menonaktifkan login, namun tetap menjaga riwayat tabungannya.
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" type="button" onClick={() => setShowArchiveConfirm(false)} disabled={archiveLoading}>
                                    Batal
                                </Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" type="button" onClick={handleArchiveDirect} disabled={archiveLoading}>
                                    {archiveLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Ya, Arsipkan
                                </Button>
                            </div>
                        </div>
                    ) : (
                        !student.nis.includes('_arc_') && (
                            <div className="pt-2 border-t border-dashed flex justify-between items-center">
                                <span className="text-xs text-muted-foreground font-medium">Siswa lulus atau keluar sekolah?</span>
                                <Button size="sm" variant="outline" type="button" className="border-blue-500 text-blue-500 hover:bg-blue-50" onClick={() => setShowArchiveConfirm(true)}>
                                    <Archive className="h-3.5 w-3.5 mr-1" />
                                    Arsipkan Siswa
                                </Button>
                            </div>
                        )
                    )}
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                    <DialogClose asChild>
                        <Button variant="outline" type="button">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={loading || showArchiveConfirm}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Simpan Perubahan
                    </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
    )
}

const DeleteStudentDialog = ({ studentId, studentName, onStudentDeleted, deleteStudentAction }: { studentId: string; studentName: string; onStudentDeleted: (studentId: string) => void; deleteStudentAction: BoundDeleteStudentAction }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        const result = await deleteStudentAction(studentId);
        setLoading(false);

        if (result.success) {
            onStudentDeleted(studentId);
            toast({
                title: 'Siswa Dihapus',
                description: result.message,
            });
            setOpen(false);
        } else {
            toast({
                title: 'Gagal Menghapus Siswa',
                description: result.message,
                variant: 'destructive'
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className='h-8 w-8 border-destructive text-destructive hover:bg-destructive/10'>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus Siswa?</DialogTitle>
                    <DialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus profil, semua data transaksi, dan akun login siswa untuk {studentName}.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" disabled={loading}>Batal</Button></DialogClose>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ya, Hapus Secara Permanen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


const ArchiveStudentDialog = ({ studentId, studentName, onStudentArchived, archiveStudentAction }: { studentId: string; studentName: string; onStudentArchived: (studentId: string, updatedNisSuffix: string, updatedName: string) => void; archiveStudentAction: BoundArchiveStudentAction }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleArchive = async () => {
        setLoading(true);
        const result = await archiveStudentAction(studentId);
        setLoading(false);

        if (result.success) {
            const timestamp = Math.floor(Date.now() / 1000);
            onStudentArchived(studentId, `_arc_${timestamp}`, `${studentName} (Diarsipkan)`);
            toast({
                title: 'Siswa Diarsipkan',
                description: result.message,
            });
            setOpen(false);
        } else {
            toast({
                title: 'Gagal Mengarsipkan Siswa',
                description: result.message,
                variant: 'destructive'
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Arsip Siswa" className='h-8 w-8 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600'>
                    <Archive className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Arsipkan Siswa?</DialogTitle>
                    <DialogDescription className="space-y-2 text-sm text-muted-foreground pt-3">
                        <p>Mengarsipkan <strong>{studentName}</strong> akan:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Membebaskan NIS asli siswa</strong> sehingga bisa digunakan kembali oleh siswa baru.</li>
                            <li><strong>Menonaktifkan login siswa</strong> di panel siswa.</li>
                            <li><strong>Menjaga seluruh riwayat transaksi keuangan</strong> agar laporan pembukuan sekolah tetap seimbang.</li>
                        </ul>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="ghost" disabled={loading}>Batal</Button></DialogClose>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleArchive} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ya, Arsipkan Siswa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const RestoreStudentDialog = ({ studentId, studentName, onStudentRestored, restoreStudentAction }: { studentId: string; studentName: string; onStudentRestored: (studentId: string, restoredNis: string, restoredName: string) => void; restoreStudentAction: BoundRestoreStudentAction }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleRestore = async () => {
        setLoading(true);
        const result = await restoreStudentAction(studentId);
        setLoading(false);

        if (result.success) {
            const restoredName = studentName.replace(' (Diarsipkan)', '');
            onStudentRestored(studentId, '', restoredName);
            toast({
                title: 'Siswa Dipulihkan',
                description: result.message,
            });
            setOpen(false);
        } else {
            toast({
                title: 'Gagal Memulihkan Siswa',
                description: result.message,
                variant: 'destructive'
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Pulihkan Siswa" className='h-8 w-8 border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600'>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pulihkan Siswa?</DialogTitle>
                    <DialogDescription className="space-y-2 text-sm text-muted-foreground pt-3">
                        <p>Memulihkan <strong>{studentName}</strong> akan:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Mengembalikan siswa ke daftar siswa **aktif**.</li>
                            <li>Mengembalikan NIS dan Nama asli mereka.</li>
                            <li>Mereset PIN login mereka ke default **123456** agar mereka bisa login kembali.</li>
                        </ul>
                        <p className="text-yellow-600 font-semibold mt-2">Catatan: Pastikan NIS asli siswa tidak sedang digunakan oleh siswa aktif lain saat ini.</p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="ghost" disabled={loading}>Batal</Button></DialogClose>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleRestore} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ya, Pulihkan Siswa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function ProfilesClientPage({
    initialStudents,
    initialProfile,
    initialUser,
    addStudentAction,
    updateStudentAction,
    deleteStudentAction,
    importStudentsAction,
    archiveStudentAction,
    restoreStudentAction,
}: ProfilesClientPageProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'nis'>('name');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // State for AddStudentDialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addPin, setAddPin] = useState('123456');

  // Efek untuk mereset PIN ke default 123456 setiap kali dialog dibuka
  useEffect(() => {
    if (addDialogOpen) {
      setAddPin('123456');
    }
  }, [addDialogOpen]);

  const handleArchiveStudent = (studentId: string, updatedNisSuffix: string, updatedName: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId ? { ...student, nis: `${student.nis.split('_arc_')[0]}${updatedNisSuffix}`, name: updatedName } : student
      )
    );
  };

  const handleRestoreStudent = (studentId: string, restoredNis: string, restoredName: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId ? { ...student, nis: student.nis.split('_arc_')[0], name: restoredName } : student
      )
    );
  };

  const studentQuota = profile?.plan === 'PRO' ? 40 : 5;
  const proStudentQuota = 40;

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === updatedStudent.id ? updatedStudent : student
      )
    );
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(student => student.id !== studentId));
  };
  
  const handleAddStudentSubmit = async (formData: FormData) => {
    if (addPin.length !== 6) {
        toast({
            title: 'PIN Tidak Valid',
            description: 'PIN harus terdiri dari tepat 6 digit angka.',
            variant: 'destructive',
        });
        return;
    }

    setAddLoading(true);
    const result = await addStudentAction(formData);
    setAddLoading(false);

    if (result.success) {
        toast({
            title: 'Siswa Ditambahkan',
            description: result.message,
        });
        if (result.student) {
             setStudents(prev => [...prev, result.student!]);
        }
        formRef.current?.reset();
        setAddPin('123456');
        setAddDialogOpen(false);
    } else {
        toast({
            title: 'Gagal Menambahkan Siswa',
            description: result.message,
            variant: 'destructive',
        });
    }
  }


  const uniqueClasses = useMemo(() => [...new Set(students.map(s => s.class))].sort(), [students]);

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const isArchived = student.nis.includes('_arc_');
        if (statusFilter === 'active') return !isArchived;
        return isArchived;
      })
      .filter(student => {
        if (selectedClass === 'all') return true;
        return student.class === selectedClass;
      })
      .filter(student => {
        if (!searchTerm) return true;
        return (
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.nis.includes(searchTerm)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            // NIS typically numeric comparison
            return a.nis.localeCompare(b.nis, undefined, { numeric: true });
        }
      });
  }, [students, searchTerm, selectedClass, sortBy, statusFilter]);


  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "nis,name,class,whatsapp_number,pin\n"
      + "24003,Contoh Siswa,9c,6281234567890,123456\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    toast({ title: 'Mengimpor siswa...', description: 'Mohon tunggu, ini mungkin memakan waktu beberapa saat.' });

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target?.result as string;
        const result = await importStudentsAction(content);
        
        if (result.success) {
            toast({
                title: 'Impor Berhasil',
                description: result.message,
            });
            // Add new students to the local state to update UI
            setStudents(prev => [...prev, ...result.newStudents]);
        } else {
            toast({
                title: 'Impor Gagal',
                description: result.message,
                variant: 'destructive',
                duration: 10000,
            });
        }
        setImporting(false);
    };
    reader.readAsText(file);
    
    // Reset file input
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className='flex items-center justify-between'>
        <h2 className="text-2xl font-bold tracking-tight">Data Siswa</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form action={handleAddStudentSubmit} ref={formRef}>
                <DialogHeader>
                  <DialogTitle>Tambah Siswa Baru</DialogTitle>
                  <DialogDescription>Akun login untuk siswa akan dibuat secara otomatis menggunakan kode sekolah Anda.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="nis">NIS (Nomor Induk Siswa)</Label>
                      <Input id="nis" name="nis" required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <Input id="fullName" name="name" required />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="class">Kelas</Label>
                      <Input id="class" name="class" required />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="whatsapp">Nomor WhatsApp Wali (Opsional)</Label>
                      <Input id="whatsapp" name="whatsapp_number" placeholder="Contoh: 6281234567890" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pin">PIN Awal Siswa (6 Digit Angka)</Label>
                      <Input 
                        id="pin" 
                        name="pin" 
                        value={addPin} 
                        onChange={(e) => setAddPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required 
                        maxLength={6}
                        inputMode="numeric"
                      />
                      <p className="text-[10px] text-muted-foreground italic">Default PIN otomatis: 123456</p>
                  </div>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Batal</Button>
                  </DialogClose>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Siswa
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Unduh Template
        </Button>
      </div>
      <Button variant="outline" onClick={handleImportClick} disabled={importing}>
        {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Import (CSV)
      </Button>
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileImport}
      />

      {/* Filter & Search Bar */}
      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardContent className="p-4 space-y-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Cari Nama atau NIS Siswa..." 
                    className="pl-9 pr-10 h-12 border-muted focus-visible:ring-primary/20 text-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status Siswa</Label>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="h-10 bg-muted/50 border-none">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Siswa Aktif</SelectItem>
                            <SelectItem value="archived">Siswa Diarsipkan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Filter Kelas</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="h-10 bg-muted/50 border-none">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3 w-3 text-muted-foreground" />
                                <SelectValue placeholder="Semua Kelas" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kelas</SelectItem>
                            {uniqueClasses.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Urutkan</Label>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="h-10 bg-muted/50 border-none">
                            <div className="flex items-center gap-2">
                                <SortAsc className="h-3 w-3 text-muted-foreground" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Nama (A-Z)</SelectItem>
                            <SelectItem value="nis">NIS (Nomor)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 text-center">
            <p className="text-sm text-blue-800 font-medium">Kuota Siswa Digunakan: {students.length} / {studentQuota}</p>
        </CardContent>
      </Card>
      
      {profile?.plan === 'TRIAL' && (
        <Card className="bg-gradient-to-br from-primary to-blue-800 text-primary-foreground shadow-lg">
            <CardContent className="p-6 space-y-4">
                <div className='flex items-center gap-4'>
                    <div className="p-3 bg-white/20 rounded-full">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Aktivasi Akun PRO Anda</h3>
                        <p className="text-primary-foreground/80 text-sm">Buka kuota hingga <span className="font-bold">{proStudentQuota} siswa</span> dan dapatkan akses penuh.</p>
                    </div>
                </div>
                <Button asChild variant="secondary" className="w-full justify-center group bg-white text-primary hover:bg-white/90">
                    <Link href="/activation">
                        Aktivasi Sekarang <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
      )}

      <div>
        <div className="flex justify-between items-end mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daftar Siswa ({filteredStudents.length})</p>
        </div>
        <div className="rounded-lg border bg-white">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[60px]">PROFIL</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>NAMA</TableHead>
                <TableHead>KELAS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Memuat data siswa...
                        </TableCell>
                    </TableRow>
                ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                        <TableCell>
                            <Button variant="outline" size="icon" className='h-8 w-8 rounded-full bg-secondary/50' asChild>
                                <Link href={`/profiles/${student.id}`}>
                                    <User className="h-4 w-4 text-primary" />
                                </Link>
                            </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                            {student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis}
                        </TableCell>
                        <TableCell className="font-bold text-sm">{student.name}</TableCell>
                        <TableCell><span className="text-[10px] font-black uppercase px-2 py-0.5 bg-muted rounded-md">{student.class}</span></TableCell>
                        <TableCell>
                            <div className='flex items-center justify-end gap-2'>
                                {statusFilter === 'active' ? (
                                    <>
                                        <EditStudentDialog 
                                            student={student} 
                                            onStudentUpdated={handleUpdateStudent} 
                                            updateStudentAction={updateStudentAction} 
                                            archiveStudentAction={archiveStudentAction}
                                            onStudentArchived={handleArchiveStudent}
                                        />
                                        <ArchiveStudentDialog 
                                            studentId={student.id} 
                                            studentName={student.name} 
                                            onStudentArchived={handleArchiveStudent} 
                                            archiveStudentAction={archiveStudentAction} 
                                        />
                                    </>
                                ) : (
                                    <RestoreStudentDialog 
                                        studentId={student.id} 
                                        studentName={student.name} 
                                        onStudentRestored={handleRestoreStudent} 
                                        restoreStudentAction={restoreStudentAction} 
                                    />
                                )}
                                <DeleteStudentDialog studentId={student.id} studentName={student.name} onStudentDeleted={handleDeleteStudent} deleteStudentAction={deleteStudentAction} />
                            </div>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                     <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                           <div className="flex flex-col items-center gap-2 opacity-40">
                               <Search className="h-10 w-10" />
                               <p className="text-xs font-bold uppercase tracking-widest">Siswa tidak ditemukan</p>
                           </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>
    </div>
  );
}
