'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink, 
  RotateCcw, 
  Loader2, 
  Smartphone,
  Eye,
  EyeOff,
  Dices,
  ShieldCheck,
  AlertCircle
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
import { resetStudentPinAction, updateStudentWhatsappAction } from '../../actions';

interface SendLoginWAButtonProps {
  student: Student;
  schoolCode: string;
}

export default function SendLoginWAButton({ student, schoolCode }: SendLoginWAButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Ambil PIN aktif siswa saat ini (jika belum tercatat, gunakan default 123456)
  const activePin = useMemo(() => student.pin || '123456', [student.pin]);

  // State PIN yang akan dikirim (otomatis terisi PIN aktif saat ini)
  const [pin, setPin] = useState(activePin);
  const [showPin, setShowPin] = useState(true);

  // Opsi apakah guru ingin mereset PIN atau hanya mengirimkan PIN aktif yang sudah ada
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Sinkronisasi nomor WhatsApp
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsapp_number || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state saat dialog dibuka
  useEffect(() => {
    if (open) {
      const currentActivePin = student.pin || '123456';
      setPin(currentActivePin);
      setIsResettingPin(false);
      setWhatsappNumber(student.whatsapp_number || '');
    }
  }, [open, student.pin, student.whatsapp_number]);

  const cleanNis = useMemo(() => {
    if (!student?.nis) return '';
    return student.nis.includes('_arc_') ? student.nis.split('_arc_')[0] : student.nis;
  }, [student]);

  // Format clean phone number to standard Indonesian country code 62xxx
  const formattedPhone = useMemo(() => {
    let clean = (whatsappNumber || '').replace(/\D/g, '');
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

  // Current PIN being sent in WA message
  const pinToSend = isResettingPin ? pin : activePin;

  // Standard professional WhatsApp message
  const waMessage = useMemo(() => {
    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari *${student.name}*

Berikut adalah informasi akun login santri/siswa untuk aplikasi Tabung.in:
━━━━━━━━━━━━━━━━━━━━
👤 *Nama Siswa:* ${student.name}
🏫 *Kode Sekolah:* ${schoolCode || '-'}
🆔 *User / NIS:* ${cleanNis}
🔑 *PIN Masuk:* ${pinToSend}
━━━━━━━━━━━━━━━━━━━━

🌐 *Alamat Login Langsung Siswa:*
${studentLoginUrl}

*(Klik tautan di atas untuk langsung membuka layar input PIN santri tanpa perlu repot mengetik ulang NIS)*

Mohon simpan informasi login ini dengan aman.
Terima kasih.`.trim();
  }, [student.name, schoolCode, cleanNis, pinToSend, studentLoginUrl]);

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

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(randomPin);
  };

  const handleSendWA = async () => {
    const targetPin = isResettingPin ? pin : activePin;

    if (!targetPin || targetPin.length !== 6 || !/^\d{6}$/.test(targetPin)) {
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
      if (isResettingPin) {
        // Alur Reset: Guru secara sengaja ingin mengubah PIN siswa
        const result = await resetStudentPinAction(student.id, targetPin, whatsappNumber);
        if (!result.success) {
          toast({
            title: 'Peringatan Reset PIN',
            description: result.message || 'Gagal menyinkronkan PIN baru di server, namun pesan tetap dapat dibuka di WhatsApp.',
            variant: 'destructive',
          });
        } else {
          router.refresh();
          toast({
            title: 'PIN Berhasil Direset',
            description: `PIN siswa diperbarui menjadi ${targetPin}.`,
          });
        }
      } else {
        // Alur Default: Hanya perbarui nomor WA jika berubah, TANPA mereset PIN siswa
        if (whatsappNumber && whatsappNumber !== student.whatsapp_number) {
          await updateStudentWhatsappAction(student.id, whatsappNumber);
          router.refresh();
        }
      }

      // Buka tautan WhatsApp Web / Aplikasi
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      toast({
        title: 'Membuka WhatsApp...',
        description: `Informasi login untuk ${student.name} siap dikirimkan.`,
      });

      setOpen(false);
    } catch (err: any) {
      console.error('Error sending login via WA:', err);
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
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Kirim Akun Login Siswa via WA
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kirimkan Nama, User/NIS, PIN aktif, dan Link Login langsung ke wali murid.
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

          {/* Opsi PIN Aktif vs Reset PIN */}
          <div className="space-y-3">
            {!isResettingPin ? (
              /* Tampilan PIN Aktif Saat Ini (Tanpa Reset) */
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-700" />
                    <span className="font-bold text-indigo-950 text-xs">PIN Aktif Saat Ini (Tanpa Reset)</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                    Siap Dikirim
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white border border-indigo-200 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold tracking-widest text-indigo-950">
                      {showPin ? activePin : '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-muted-foreground hover:text-indigo-600 p-0.5 transition-colors"
                      title={showPin ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground italic">
                    {student.pin ? 'PIN aktif siswa' : 'PIN bawaan sistem'}
                  </span>
                </div>

                <p className="text-[10px] text-indigo-800 leading-relaxed">
                  ✓ PIN ini adalah PIN yang saat ini digunakan siswa (misal siswa pernah ganti ke <strong>{activePin}</strong>). Pesan WA akan dikirim dengan PIN ini tanpa mengubah kata sandi akun santri.
                </p>

                {/* Tombol Toggle jika guru memang berniat ingin mereset */}
                <div className="pt-1 border-t border-indigo-200/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingPin(true);
                      setPin(activePin);
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" /> Ingin Ganti / Reset PIN Baru?
                  </button>
                </div>
              </div>
            ) : (
              /* Form Ubah / Reset PIN Baru */
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    Reset & Ganti PIN Siswa
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResettingPin(false)}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline"
                  >
                    Batal Reset (Gunakan PIN Aktif)
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-pin-input" className="text-[11px] font-bold text-amber-950">
                      Masukkan 6 Digit PIN Baru:
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateRandomPin}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
                      >
                        <Dices className="h-2.5 w-2.5" /> Acak PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setPin('123456')}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> 123456
                      </button>
                    </div>
                  </div>
                  <Input
                    id="login-pin-input"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Contoh: 555555"
                    maxLength={6}
                    inputMode="numeric"
                    className="h-10 font-mono tracking-widest text-center text-base font-bold bg-white border-amber-300 focus-visible:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-900 italic">
                    *Saat pesan WA dikirim, PIN siswa akan direset ke nomor di atas dan otomatis disinkronkan.
                  </p>
                </div>
              </div>
            )}
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
            disabled={loading || (isResettingPin && pin.length !== 6) || !formattedPhone}
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
                {isResettingPin ? 'Reset PIN & Buka WhatsApp' : 'Buka & Kirim WhatsApp'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
