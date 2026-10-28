'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/AppLogo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  CheckCircle2,
  Phone,
  School,
  Mail,
  User,
  RefreshCw,
  LogOut,
  Send,
  Edit3,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { getPendingTeacherInfo, updateTeacherPendingInfo, logoutAction } from './actions';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [userData, setUserData] = useState<{
    id?: string;
    email?: string;
    fullName?: string;
    schoolName?: string;
    phoneNumber?: string;
    approvalStatus?: string;
    adminWhatsApp?: string;
  }>({});

  const [formFullName, setFormFullName] = useState('');
  const [formSchoolName, setFormSchoolName] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');

  const loadData = async () => {
    try {
      const res = await getPendingTeacherInfo();
      if (!res.user) {
        router.replace('/login');
        return;
      }

      // Jika sudah di-approve, langsung arahkan ke dashboard
      if (res.profile?.approval_status === 'APPROVED') {
        router.replace(res.profile.school_code ? '/dashboard' : '/welcome');
        return;
      }

      const email = res.user.email || '';
      const fullName = res.profile?.full_name || res.user.metadata?.full_name || res.user.metadata?.name || '';
      const schoolName = res.profile?.school_name || res.user.metadata?.school_name || '';
      const phoneNumber = res.profile?.phone_number || res.user.metadata?.phone_number || '';
      const approvalStatus = res.profile?.approval_status || 'PENDING';

      setUserData({
        id: res.user.id,
        email,
        fullName,
        schoolName,
        phoneNumber,
        approvalStatus,
        adminWhatsApp: res.adminWhatsApp,
      });

      setFormFullName(fullName);
      setFormSchoolName(schoolName);
      setFormPhoneNumber(phoneNumber);

      // Jika data sekolah atau nomor WA belum diisi (misal daftar via Google), buka mode input
      if (!schoolName || !phoneNumber) {
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Error fetching pending user info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await getPendingTeacherInfo();
      if (res.profile?.approval_status === 'APPROVED') {
        toast({
          title: 'Akun Anda Telah Disetujui!',
          description: 'Mengalihkan Anda ke halaman dashboard...',
        });
        router.replace(res.profile.school_code ? '/dashboard' : '/welcome');
      } else {
        toast({
          title: 'Status Masih Menunggu',
          description: 'Akun Anda saat ini masih menunggu konfirmasi dari Admin Pusat.',
        });
      }
    } catch {
      toast({
        title: 'Gagal mengecek status',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      toast({ title: 'Nama Lengkap Wajib Diisi', variant: 'destructive' });
      return;
    }
    if (!formSchoolName.trim()) {
      toast({ title: 'Nama Sekolah Wajib Diisi', variant: 'destructive' });
      return;
    }
    if (!formPhoneNumber.trim()) {
      toast({ title: 'Nomor WhatsApp Wajib Diisi', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const res = await updateTeacherPendingInfo({
      full_name: formFullName,
      school_name: formSchoolName,
      phone_number: formPhoneNumber,
    });
    setSaving(false);

    if (res.success) {
      toast({ title: 'Berhasil Disimpan', description: 'Informasi akun guru Anda berhasil diperbarui.' });
      setUserData((prev) => ({
        ...prev,
        fullName: formFullName,
        schoolName: formSchoolName,
        phoneNumber: formPhoneNumber,
      }));
      setIsEditing(false);
    } else {
      toast({ title: 'Gagal Menyimpan', description: res.message, variant: 'destructive' });
    }
  };

  // Format nomor WhatsApp admin
  const rawAdminNumber = userData.adminWhatsApp || '6289522537711';
  let cleanAdminWa = rawAdminNumber.replace(/[^0-9]/g, '');
  if (cleanAdminWa.startsWith('0')) {
    cleanAdminWa = '62' + cleanAdminWa.slice(1);
  }

  const waMessage = `Assalamu'alaikum Admin Pusat Tabungin,

Saya guru baru telah mendaftar di sistem Tabungin:
• Nama Guru: ${userData.fullName || formFullName || '-'}
• Email: ${userData.email || '-'}
• Nama Sekolah: ${userData.schoolName || formSchoolName || '-'}
• No. WhatsApp: ${userData.phoneNumber || formPhoneNumber || '-'}

Mohon bantuan untuk konfirmasi dan persetujuan (approval) akun guru saya agar dapat segera digunakan. Terima kasih!`;

  const waUrl = `https://wa.me/${cleanAdminWa}?text=${encodeURIComponent(waMessage)}`;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Memeriksa status persetujuan akun...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Logo */}
        <div className="flex justify-center mb-2">
          <AppLogo />
        </div>

        <Card className="border-border/60 shadow-xl overflow-hidden backdrop-blur bg-card/95">
          {/* Top Banner Status */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Status: Menunggu Persetujuan
              </span>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
              PENDING
            </Badge>
          </div>

          <CardHeader className="text-center pt-6 pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center mb-2 text-amber-600 dark:text-amber-400">
              <Clock className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Pendaftaran Akun Guru Sedang Ditinjau
            </CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto pt-1">
              Akun guru baru Anda telah tercatat dan sedang menunggu verifikasi serta persetujuan resmi dari{' '}
              <strong className="text-foreground">Admin Pusat Tabungin</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Kartu Informasi Guru */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Identitas Guru Terdaftar
                </span>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Ubah
                  </Button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveInfo} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="formFullName" className="text-xs font-semibold">Nama Lengkap Guru</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="formFullName"
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd"
                        className="pl-9 h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formSchoolName" className="text-xs font-semibold">Nama Sekolah / Lembaga</Label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="formSchoolName"
                        value={formSchoolName}
                        onChange={(e) => setFormSchoolName(e.target.value)}
                        placeholder="Contoh: SDIT Al-Fatih Bandung"
                        className="pl-9 h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="formPhoneNumber" className="text-xs font-semibold">Nomor WhatsApp Guru</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="formPhoneNumber"
                        value={formPhoneNumber}
                        onChange={(e) => setFormPhoneNumber(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="pl-9 h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    {userData.schoolName && userData.phoneNumber && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        Batal
                      </Button>
                    )}
                    <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                      Simpan Data
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-1">
                  <div>
                    <span className="text-xs text-muted-foreground block">Nama Lengkap:</span>
                    <span className="font-semibold text-foreground">{userData.fullName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Email Akun:</span>
                    <span className="font-medium text-foreground">{userData.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Nama Sekolah:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-muted-foreground" />
                      {userData.schoolName || <span className="text-amber-600 font-normal italic">Belum diisi</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">No. WhatsApp:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {userData.phoneNumber || <span className="text-amber-600 font-normal italic">Belum diisi</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Utama: Kirim WhatsApp Konfirmasi ke Admin Pusat */}
            <div className="space-y-3 pt-1">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Agar akun Anda segera diverifikasi dan diaktifkan, klik tombol di bawah untuk mengirim pesan konfirmasi otomatis ke WhatsApp Admin Pusat:
                </p>
              </div>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-5 h-5" />
                <span>Kirim Konfirmasi ke WhatsApp Admin Pusat</span>
              </a>

              <p className="text-[11px] text-center text-muted-foreground">
                Nomor Admin Pusat: <span className="font-mono font-medium text-foreground">{cleanAdminWa}</span>
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2 pb-6 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30">
            <Button
              variant="outline"
              className="w-full sm:w-1/2"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Cek Status Persetujuan
            </Button>

            <form action={logoutAction} className="w-full sm:w-1/2">
              <Button variant="ghost" type="submit" className="w-full text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar / Ganti Akun
              </Button>
            </form>
          </CardFooter>
        </Card>

        {/* Info Box */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong>Mengapa akun guru memerlukan persetujuan?</strong>
            <p className="mt-0.5 text-muted-foreground">
              Tabungin mengutamakan keamanan dan integritas keuangan siswa di setiap sekolah. Verifikasi akun memastikan hanya guru resmi yang dapat mengelola data dan saldo tabungan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
