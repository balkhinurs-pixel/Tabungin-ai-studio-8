
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Loader2, School, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser } from '@supabase/supabase-js';
import { AppLogo } from '@/components/AppLogo';
import { registerUserRoleAction } from './actions';

export default function WelcomePage() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            setUser(authUser);
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, school_code')
                .eq('id', authUser.id)
                .maybeSingle();
            
            // Jika sudah punya kode sekolah, langsung lempar ke dashboard
            if (profile?.school_code) {
                router.replace('/dashboard');
            }
        } else {
            router.push('/login');
        }
    }
    fetchUser();
  }, [supabase, router]);

  const handleSaveSettings = async () => {
    if (!user || !user.email) return;
    
    if (!schoolName) {
        toast({ title: "Nama Sekolah Wajib Diisi", variant: 'destructive' });
        return;
    }
    if (!schoolCode) {
        toast({ title: "Kode Sekolah Wajib Diisi", variant: 'destructive' });
        return;
    }

    setSaving(true);
    
    // Default role untuk pendaftaran baru lewat sini adalah TEACHER
    const result = await registerUserRoleAction({
        role: 'TEACHER',
        schoolName: schoolName,
        schoolCode: schoolCode
    });
    
    setSaving(false);

    if (!result.success) {
        toast({ 
            title: "Gagal", 
            description: result.message, 
            variant: 'destructive' 
        });
    } else {
        toast({ title: "Berhasil!", description: "Sekolah Anda telah terdaftar." });
        router.push('/dashboard');
        router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />
      
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden relative z-10">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center pb-2">
            <div className="mb-6 flex justify-center">
                <AppLogo />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Konfigurasi Sekolah</CardTitle>
            <CardDescription>
                Selamat datang! Mohon lengkapi profil sekolah Anda untuk mulai mengelola tabungan siswa.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label htmlFor="schoolName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Sekolah / Instansi</Label>
                    <div className="relative">
                        <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="schoolName" 
                            value={schoolName} 
                            onChange={(e) => setSchoolName(e.target.value)} 
                            placeholder="Contoh: SDIT Al-Ikhlas"
                            className="pl-10 h-12 rounded-xl"
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="schoolCode" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Buat Kode Sekolah Unik
                    </Label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="schoolCode" 
                            value={schoolCode} 
                            onChange={(e) => setSchoolCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                            placeholder="Contoh: al-ikhlas" 
                            className="pl-10 h-12 rounded-xl border-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <p className="text-[9px] text-muted-foreground italic">
                        PENTING: Kode ini akan digunakan oleh siswa untuk login ke akun mereka.
                    </p>
                </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 transition-all active:scale-95">
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Daftarkan Sekolah Sekarang
            </Button>
        </CardContent>
      </Card>
    </main>
  );
}
