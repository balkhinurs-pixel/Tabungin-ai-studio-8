'use client';

import React, { useState } from 'react';
import { KeyRound, RotateCcw, Check, Copy, MessageSquare, Loader2, ShieldAlert } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resetStudentPinAction } from '@/app/(main)/profiles/actions';
import type { Student } from '@/types';

interface ResetPinButtonProps {
  student: Student;
}

export default function ResetPinButton({ student }: ResetPinButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [newPinResult, setNewPinResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  const handleResetPin = async (pinValueToUse?: string) => {
    const targetPin = pinValueToUse || pin;

    if (!targetPin || targetPin.length !== 6 || !/^\d{6}$/.test(targetPin)) {
      toast({
        title: 'PIN Tidak Valid',
        description: 'PIN harus terdiri dari tepat 6 digit angka.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await resetStudentPinAction(student.id, targetPin);
      if (res.success) {
        setNewPinResult(res.pin || targetPin);
        toast({
          title: 'PIN Berhasil Direset',
          description: res.message,
        });
      } else {
        toast({
          title: 'Gagal Mereset PIN',
          description: res.message,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Kesalahan Sistem',
        description: err.message || 'Terjadi kesalahan saat mereset PIN.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPin = () => {
    if (!newPinResult) return;
    navigator.clipboard.writeText(newPinResult);
    setCopied(true);
    toast({ title: 'PIN Disalin', description: `PIN ${newPinResult} berhasil disalin ke clipboard.` });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWA = () => {
    if (!student.whatsapp_number || !newPinResult) return;
    const cleanPhone = student.whatsapp_number.replace(/\D/g, '');
    const message = `*🔐 INFORMASI RESET PIN TABUNGAN SISWA*
--------------------------------------------
Yth. Orang Tua / Wali dari:
Nama: *${student.name}*
NIS: *${student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis}*
Kelas: *${student.class}*

PIN login dan transaksi tabungan siswa telah berhasil direset menjadi:
🔑 *PIN Baru: ${newPinResult}*

Silakan simpan PIN ini dengan baik untuk login ke aplikasi siswa atau bertransaksi di kantin sekolah.
--------------------------------------------
_Pesan otomatis dari Sistem Tabungan Digital Sekolah._`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setPin('123456');
      setNewPinResult(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button 
          id="btn-reset-pin-profile"
          className="w-full justify-center h-12 text-sm font-bold rounded-xl bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 transition-all active:scale-95 shadow-sm shadow-purple-50"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Reset PIN Siswa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <KeyRound className="h-5 w-5" />
            <DialogTitle>Reset PIN Siswa</DialogTitle>
          </div>
          <DialogDescription>
            Reset PIN login dan transaksi untuk <strong>{student.name}</strong> (NIS: {student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis}).
          </DialogDescription>
        </DialogHeader>

        {newPinResult ? (
          <div className="space-y-4 py-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">PIN Baru Siswa</span>
              <div className="text-3xl font-black font-mono tracking-widest text-emerald-950">
                {newPinResult}
              </div>
              <p className="text-xs text-emerald-700">
                PIN telah aktif dan langsung dapat digunakan siswa untuk login serta transaksi di kantin/kiosk.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={handleCopyPin}
                className="w-full text-xs font-semibold"
              >
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? 'Tersalin!' : 'Salin PIN'}
              </Button>
              {student.whatsapp_number && (
                <Button 
                  onClick={handleSendWA}
                  className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Kirim ke WA Wali
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-pin" className="text-xs font-bold text-foreground">
                  PIN Baru (6 Digit Angka)
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[11px] font-bold text-purple-700 hover:text-purple-800"
                  onClick={() => setPin('123456')}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Gunakan 123456
                </Button>
              </div>
              <Input
                id="custom-pin"
                value={pin}
                onChange={handlePinChange}
                placeholder="6 digit angka (contoh: 123456)"
                maxLength={6}
                inputMode="numeric"
                className="font-mono text-base tracking-widest text-center h-12"
              />
            </div>

            <div className="p-3 bg-muted/60 border rounded-lg flex items-start gap-2.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                PIN standar sekolah adalah <strong>123456</strong>. Siswa juga dapat mengubah PIN mereka secara mandiri setelah login ke dasbor siswa.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {newPinResult ? (
            <DialogClose asChild>
              <Button className="w-full" variant="default">Selesai</Button>
            </DialogClose>
          ) : (
            <div className="flex w-full gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={loading}>Batal</Button>
              </DialogClose>
              <Button 
                onClick={() => handleResetPin()} 
                disabled={loading || pin.length !== 6}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Reset PIN Sekarang
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
