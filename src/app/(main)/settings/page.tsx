
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, DatabaseZap, Loader2, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types';
import type { AuthUser } from '@supabase/supabase-js';
import BackupRestore from './_components/BackupRestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            setUser(authUser);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                toast({ title: "Gagal memuat profil", description: error.message, variant: 'destructive' });
            } else {
                setProfile(data);
                setSchoolName(data.school_name || '');
                setSchoolCode(data.school_code || '');
            }
        }
        setLoading(false);
    }
    fetchProfile();
  }, [supabase, toast]);

  const handleSaveSettings = async () => {
    if (!user) return;
    
    const cleanCode = schoolCode.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    
    if (!cleanCode) {
        toast({ title: "Kode Sekolah Wajib Diisi", description: "Mohon isi kode unik tanpa spasi/karakter khusus.", variant: 'destructive' });
        return;
    }

    setSaving(true);
    const { error } = await supabase
        .from('profiles')
        .update({
            school_name: schoolName,
            school_code: cleanCode, 
        })
        .eq('id', user.id);
    
    setSaving(false);
    if (error) {
        toast({ title: "Gagal Menyimpan", description: "Kode sekolah mungkin sudah digunakan. Coba kode lain.", variant: 'destructive' });
    } else {
        toast({ title: "Pengaturan Disimpan", description: "Informasi sekolah Anda telah diperbarui." });
        setSchoolCode(cleanCode);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-primary">Pengaturan Umum</h2>

      <Tabs defaultValue="school" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 rounded-2xl bg-muted/50 p-1.5 h-14">
          <TabsTrigger value="school" className="rounded-xl font-bold text-xs uppercase tracking-wider">Identitas Sekolah</TabsTrigger>
          <TabsTrigger value="data" className="rounded-xl font-bold text-xs uppercase tracking-wider">Backup Data</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="space-y-4">
            <Card className="shadow-sm border-primary/10">
                <CardHeader>
                <CardTitle>Informasi Dasar</CardTitle>
                <CardDescription>Nama dan kode ini digunakan sebagai identitas utama login siswa dan kantin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
                        <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
                    </div>
                ) : (
                <>
                    <div className="space-y-2">
                    <Label htmlFor="schoolName">Nama Sekolah/Instansi</Label>
                    <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Contoh: SDIT Al-Ikhlas" />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="schoolCode">Kode Unik Login</Label>
                    <Input id="schoolCode" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} placeholder="Contoh: alikhlas" />
                    <p className="text-[10px] text-muted-foreground italic">Gunakan huruf kecil dan angka saja tanpa spasi.</p>
                    </div>
                    
                    <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                        <Info className="h-4 w-4 text-blue-700" />
                        <AlertDescription className="text-xs">
                            Manajemen Kantin dan Settlement kini tersedia di menu <strong>Keuangan</strong> di sidebar atau dashboard utama.
                        </AlertDescription>
                    </Alert>

                    <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Perubahan
                    </Button>
                </>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
            <Card className="shadow-sm border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                    <DatabaseZap className="h-5 w-5 text-primary" />
                    <CardTitle>Cadangkan & Pulihkan</CardTitle>
                </div>
                <CardDescription>Simpan data secara mandiri untuk menghindari kehilangan data jika terjadi kesalahan sistem.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                <BackupRestore />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
