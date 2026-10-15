'use client';

import React, { useState, useMemo } from 'react';
import { 
  MessageCircle, 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink, 
  RotateCcw, 
  Loader2, 
  Smartphone
} from 'lucide-react';
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
import { type Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { resetStudentPinAction } from '../../actions';

interface SendLoginWAButtonProps {
  student: Student;
  schoolCode: string;
}

export default function SendLoginWAButton({ student, schoolCode }: SendLoginWAButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('123456');
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsapp_number || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanNis = useMemo(() => {
    if (!student?.nis) return '';
    return student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis;
  }, [student]);

  // Format clean phone number to standard Indonesian country code 62xxx
  const formattedPhone = useMemo(() => {
    let clean = whatsappNumber.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  }, [whatsappNumber]);

  // Construct absolute student login URL with auto prefilled parameters
  const studentLoginUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanSchoolCode = (schoolCode || '').toLowerCase().trim();
    return `${origin}/student-login?school_code=${encodeURIComponent(cleanSchoolCode)}&nis=${encodeURIComponent(cleanNis)}`;
  }, [schoolCode, cleanNis]);

  // Standard professional WhatsApp message
  const waMessage = useMemo(() => {
    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari *${student.name}*

Berikut adalah informasi akun login santri/siswa untuk aplikasi Tabung.in:
━━━━━━━━━━━━━━━━━━━━
👤 *Nama Siswa:* ${student.name}
🏫 *Kode Sekolah:* ${schoolCode || '-'}
🆔 *User / NIS:* ${cleanNis}
🔑 *PIN Masuk:* ${pin || '123456'}
━━━━━━━━━━━━━━━━━━━━

🌐 *Alamat Login Langsung Siswa:*
${studentLoginUrl}

*(Klik tautan di atas untuk langsung membuka layar input PIN santri tanpa perlu repot mengetik ulang NIS)*

Mohon simpan informasi login ini dengan aman.
Terima kasih.`.trim();
  }, [student.name, schoolCode, cleanNis, pin, studentLoginUrl]);

  // WhatsApp Web / Mobile URL
  const whatsappUrl = useMemo(() => {
    if (formattedPhone) {
      return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
  }, [formattedPhone, waMessage]);

  const handleCopyMessage = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(waMessage);
      setCopied(true);
      toast({
        title: 'Pesan Disalin',
        description: 'Teks informasi akun login berhasil disalin ke clipboard.',
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWA = async () => {
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast({
        title: 'PIN Tidak Valid',
        description: 'PIN masuk harus terdiri dari tepat 6 digit angka.',
        variant: 'destructive',
      });
      return;
    }

    if (!formattedPhone) {
      toast({
        title: 'Nomor WhatsApp Kosong',
        description: 'Mohon isi nomor WhatsApp wali siswa terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Sync student PIN and phone number in Supabase
      const result = await resetStudentPinAction(student.id, pin, whatsappNumber);
      
      if (!result.success) {
        toast({
          title: 'Peringatan Pembaruan Akun',
          description: result.message || 'Gagal menyinkronkan PIN siswa di server, namun pesan tetap dapat dikirim.',
          variant: 'destructive',
        });
      }

      // 2. Redirect to WhatsApp Web/App
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      toast({
        title: 'Membuka WhatsApp...',
        description: `Informasi login untuk ${student.name} telah disiapkan di WhatsApp.`,
      });

      setOpen(false);
    } catch (err: any) {
      console.error('Error sending login via WA:', err);
      // Fallback: still open WhatsApp even if sync has issues
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full justify-center h-12 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-md shadow-emerald-200/50"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Kirim Akun Login via WA
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Kirim Akun Login Siswa via WA
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kirimkan Nama, User/NIS, PIN, dan Link Login langsung ke wali murid.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Ringkasan Data Siswa */}
          <div className="p-3 bg-muted/60 border border-muted rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Nama Siswa</p>
              <p className="font-bold text-foreground text-sm truncate">{student.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Kelas</p>
              <p className="font-bold text-foreground">{student.class}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">User / NIS</p>
              <p className="font-mono font-bold text-foreground">{cleanNis}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Kode Sekolah</p>
              <p className="font-mono font-bold text-foreground uppercase">{schoolCode || '-'}</p>
            </div>
          </div>

          {/* Form Input PIN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-pin-input" className="text-xs font-bold flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                PIN Masuk Siswa (6 Digit)
              </Label>
              <button
                type="button"
                onClick={() => setPin('123456')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="h-3 w-3" /> Gunakan 123456
              </button>
            </div>
            <Input
              id="login-pin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Contoh: 123456"
              maxLength={6}
              inputMode="numeric"
              className="h-11 font-mono tracking-widest text-center text-base font-bold bg-muted/30 focus-visible:ring-emerald-500"
            />
            <p className="text-[10px] text-muted-foreground italic">
              *Jika siswa lupa PIN, Anda dapat mengetikkan PIN baru di sini. Sistem akan otomatis memperbarui PIN akun siswa saat pesan dikirim.
            </p>
          </div>

          {/* Form Input Nomor WhatsApp Wali */}
          <div className="space-y-1.5">
            <Label htmlFor="login-wa-number" className="text-xs font-bold flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              Nomor WhatsApp Wali Siswa
            </Label>
            <Input
              id="login-wa-number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Contoh: 081234567890 atau 6281234567890"
              inputMode="tel"
              className="h-11 font-mono text-sm bg-muted/30 focus-visible:ring-emerald-500"
            />
            <p className="text-[10px] text-muted-foreground">
              Nomor tujuan WhatsApp wali. Sistem otomatis mengonversi awalan 08 menjadi 628.
            </p>
          </div>

          {/* Live Preview Pesan WhatsApp */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Pratinjau Pesan WhatsApp
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Tersalin' : 'Salin Teks'}
              </button>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-[11px] leading-relaxed text-emerald-950 font-sans whitespace-pre-line max-h-40 overflow-y-auto font-medium">
              {waMessage}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto text-xs" disabled={loading}>
              Batal
            </Button>
          </DialogClose>
          <Button
            onClick={handleSendWA}
            disabled={loading || pin.length !== 6 || !formattedPhone}
            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200/50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyiapkan...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka & Kirim WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
