'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Store, 
  Plus, 
  Trash2, 
  Loader2, 
  UtensilsCrossed,
  Info,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { addCantineAction, deleteCantineAction, getCantineOutletsAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CantineManagement() {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cantineId, setCantineId] = useState('');
  const [pin, setPin] = useState('');
  
  // Delete Verification States
  const [outletToDelete, setOutletToDelete] = useState<any>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  
  const { toast } = useToast();

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const data = await getCantineOutletsAction();
      setOutlets(data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleAddCantine = async () => {
    const sanitizedId = cantineId.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    
    if (!sanitizedId || sanitizedId.length < 3) {
        toast({ title: "ID Terlalu Pendek", description: "ID Kantin minimal 3 karakter huruf/angka.", variant: "destructive" });
        return;
    }

    if (pin.length < 6) {
        toast({ title: "PIN Tidak Valid", description: "PIN harus terdiri dari 6 digit angka.", variant: "destructive" });
        return;
    }

    setAdding(true);
    const result = await addCantineAction({ cantineId: sanitizedId, pin });
    setAdding(false);

    if (result.success) {
        toast({ title: "Berhasil", description: result.message });
        setCantineId('');
        setPin('');
        fetchOutlets();
    } else {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!outletToDelete) return;
    
    setDeleting(true);
    const result = await deleteCantineAction(outletToDelete.id);
    setDeleting(false);

    if (result.success) {
        toast({ title: "Berhasil", description: result.message });
        setOutletToDelete(null);
        setConfirmDeleteName('');
        fetchOutlets();
    } else {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-emerald-50 border-emerald-100 text-emerald-800 rounded-2xl">
        <Info className="h-5 w-5 text-emerald-600" />
        <AlertDescription className="text-[11px] font-medium leading-relaxed">
            Gunakan fitur ini untuk membuatkan akun bagi penjual kantin di sekolah Anda. Mereka akan bisa memproses pembayaran dari tabungan siswa.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" /> Daftar Outlet
        </h3>
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" className="h-10 rounded-full bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 font-bold px-4">
                    <Plus className="mr-1.5 h-4 w-4" /> Tambah Kantin
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-tight">Buat Akun Outlet</DialogTitle>
                    <DialogDescription className="text-xs font-medium">ID Kantin akan digunakan petugas untuk login di halaman Login Kantin.</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="c_id" className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID Kantin (Tanpa Spasi)</Label>
                        <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                            <Input 
                                id="c_id" 
                                placeholder="Misal: kantin-sehat" 
                                className="pl-10 h-12 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-bold"
                                value={cantineId}
                                onChange={(e) => setCantineId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            />
                        </div>
                        <p className="text-[9px] text-muted-foreground italic px-1">Tips: Gunakan nama yang singkat dan mudah diingat.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="c_pin" className="text-[10px] font-black uppercase tracking-widest text-gray-400">PIN Login (6 Digit)</Label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                            <Input 
                                id="c_pin" 
                                type="password" 
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="******" 
                                className="pl-10 h-12 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-mono text-lg tracking-widest"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddCantine} disabled={adding} className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-base font-black shadow-xl shadow-orange-100">
                        {adding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                        DAFTARKAN OUTLET
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Memuat Data...</p>
            </div>
        ) : outlets.length > 0 ? (
            outlets.map((outlet) => (
                <div key={outlet.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-white border border-gray-100 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 shadow-inner">
                            <Store className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <p className="font-black text-sm text-gray-900 leading-tight uppercase tracking-tight">{outlet.displayId}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Status Aktif</p>
                            </div>
                        </div>
                    </div>
                    
                    <Dialog open={outletToDelete?.id === outlet.id} onOpenChange={(open) => {
                        if (!open) {
                            setOutletToDelete(null);
                            setConfirmDeleteName('');
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-full text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                onClick={() => setOutletToDelete(outlet)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl">
                            <DialogHeader>
                                <div className="flex items-center gap-2 text-rose-600 mb-2">
                                    <AlertTriangle className="h-6 w-6" />
                                    <DialogTitle className="font-black uppercase tracking-tight">Hapus Akun Outlet?</DialogTitle>
                                </div>
                                <DialogDescription className="space-y-4">
                                    <p className="text-sm font-medium">Tindakan ini akan menghapus akun akses untuk <span className="font-black text-gray-900">{outlet.displayId}</span> secara permanen.</p>
                                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 space-y-3">
                                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.2em]">Konfirmasi Penghapusan</p>
                                        <p className="text-[11px] text-rose-600 font-medium">Ketik kembali ID kantin <span className="font-black underline">{outlet.displayId}</span> di bawah:</p>
                                        <Input 
                                            value={confirmDeleteName}
                                            onChange={(e) => setConfirmDeleteName(e.target.value)}
                                            placeholder="Ketik ID di sini..."
                                            className="bg-white border-rose-200 focus:ring-rose-500 h-12 rounded-xl text-sm font-black"
                                        />
                                    </div>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex gap-2 pt-2">
                                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setOutletToDelete(null)} disabled={deleting}>Batal</Button>
                                <Button 
                                    variant="destructive" 
                                    disabled={confirmDeleteName !== outlet.displayId || deleting}
                                    onClick={handleDelete}
                                    className="flex-1 rounded-xl font-black shadow-lg shadow-rose-100"
                                >
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    HAPUS PERMANEN
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            ))
        ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-[3rem] border-gray-100 bg-gray-50/50">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-200 mb-4 opacity-30" />
                <div className="space-y-1">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Belum Ada Outlet</p>
                    <p className="text-[10px] text-gray-400 font-medium">Klik tombol tambah untuk mendaftarkan kantin.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
