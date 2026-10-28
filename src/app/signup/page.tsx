
'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { signup } from './actions';
import { loginWithGoogle } from '@/app/login/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Terminal, Loader2, User, Building, Phone, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Google</title>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.62 4.21 1.7l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
);

function SignupContent() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message');
    const successMessage = searchParams.get('success');
    const [showPassword, setShowPassword] = useState(false);

    if (successMessage) {
        return (
             <div className="space-y-4">
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="font-bold">Pendaftaran Terkirim!</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                      {successMessage}
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/pending-approval">Buka Status Persetujuan Akun</Link>
                </Button>
             </div>
        );
    }
    
    return (
        <>
            <form action={loginWithGoogle} className="w-full mb-4">
                <Button 
                    type="submit" 
                    variant="outline" 
                    className="w-full h-11 flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
                >
                    <GoogleIcon className="h-4 w-4" />
                    Daftar Cepat dengan Google
                </Button>
            </form>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-semibold">
                        Atau Daftar Manual
                    </span>
                </div>
            </div>

            <form action={signup} className="space-y-3.5">
                <div className="space-y-1.5">
                    <Label htmlFor="full_name" className="text-xs font-semibold">Nama Lengkap Guru</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="full_name"
                            name="full_name"
                            placeholder="Contoh: Ustadz Ahmad Fauzi"
                            className="pl-9 h-10 text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="school_name" className="text-xs font-semibold">Nama Sekolah / Pesantren / Madrasah</Label>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="school_name"
                            name="school_name"
                            placeholder="Contoh: SMP Islam Al-Azhar"
                            className="pl-9 h-10 text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="phone_number" className="text-xs font-semibold">Nomor WhatsApp Aktif</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="phone_number"
                            name="phone_number"
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            className="pl-9 h-10 text-sm"
                            required
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Digunakan admin pusat untuk konfirmasi dan aktivasi akun.</p>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">Alamat Email Guru</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="guru@sekolah.sch.id"
                            className="pl-9 h-10 text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold">Kata Sandi</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="password" 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Minimal 6 karakter"
                            className="pl-9 pr-9 h-10 text-sm"
                            required 
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                    </Alert>
                )}

                <SubmitButton className="w-full bg-primary hover:bg-primary/90 h-11 text-sm font-bold mt-2">
                    Daftar & Konfirmasi Admin
                </SubmitButton>
            </form>

            <div className="mt-4 text-center text-xs text-muted-foreground">
                Sudah punya akun guru?{' '}
                <Link href="/login" className="underline font-semibold text-primary">
                Masuk di sini
                </Link>
            </div>
        </>
    );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center pb-4">
          <div className="mb-2 flex justify-center">
            <AppLogo />
          </div>
          <CardTitle className="text-2xl font-black text-foreground">Daftar Akun Guru Baru</CardTitle>
          <CardDescription className="text-xs">
            Isi identitas untuk pendaftaran sistem tabungan digital sekolah Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <SignupContent />
            </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

