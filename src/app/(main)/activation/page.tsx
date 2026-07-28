
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ActivationPage() {
  const supabase = createClient();
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleActivate = async () => {
    if (!activationCode) {
      toast({
        title: 'Kode Kosong',
        description: 'Silakan masukkan kode aktivasi Anda.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
         toast({ title: 'Gagal', description: 'Anda harus masuk untuk aktivasi.', variant: 'destructive' });
         setLoading(false);
         return;
    }

    const { data: codeData, error: codeError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', activationCode)
        .single();
    
    if (codeError || !codeData) {
        toast({
            title: 'Aktivasi Gagal',
            description: 'Kode aktivasi yang Anda masukkan tidak valid.',
            variant: 'destructive',
        });
        setLoading(false);
        return;
    }

    if (codeData.is_used) {
        toast({
            title: 'Kode Telah Digunakan',
            description: 'Kode aktivasi ini sudah pernah digunakan.',
            variant: 'destructive',
        });
        setLoading(false);
        return;
    }
    
    const { error: activationError } = await supabase.rpc('activate_account', {
        p_code: activationCode,
        p_user_id: user.id
    });


    if (activationError) {
        const errorMessage = activationError.message.includes('invalid_or_used_code')
            ? 'Kode aktivasi tidak valid atau sudah digunakan.'
            : 'Terjadi kesalahan saat aktivasi. Silakan coba lagi.';
        toast({ title: 'Aktivasi Gagal', description: errorMessage, variant: 'destructive' });
    } else {
        toast({
            title: 'Aktivasi Berhasil!',
            description: 'Akun Anda telah berhasil diaktivasi ke PRO. Semua fitur telah terbuka.',
        });
        router.push('/dashboard');
        router.refresh(); 
    }

    setLoading(false);
  };

  const handleOrderWA = () => {
    const message = encodeURIComponent("Halo Admin Tabungin,\n\nSaya tertarik untuk meningkatkan akun saya ke versi PRO. Mohon informasi mengenai cara mendapatkan Kode Aktivasi/Serial Number.\n\nTerima kasih.");
    window.open(`https://wa.me/6287734390171?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-bold tracking-tight">Aktivasi Aplikasi</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Masukkan Kode Aktivasi</CardTitle>
          <CardDescription>
            Masukkan kode aktivasi yang telah Anda terima untuk upgrade ke akun PRO, membuka semua fitur dan meningkatkan kuota siswa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activation-code">Kode Aktivasi</Label>
            <Input
              id="activation-code"
              placeholder="PRO-XXXXX-XXXXX-XXXXX"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
          <Button onClick={handleActivate} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Aktifkan Sekarang
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Atau</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">Belum memiliki kode aktivasi?</p>
            <Button variant="outline" onClick={handleOrderWA} className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              <MessageCircle className="mr-2 h-4 w-4" />
              Pesan Kode Aktivasi (WA)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
