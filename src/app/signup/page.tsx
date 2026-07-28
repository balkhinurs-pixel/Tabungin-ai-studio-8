
'use client';

import Link from 'next/link';
import { Suspense } from 'react';
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
import { SubmitButton } from '@/components/SubmitButton';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';


function SignupContent() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message');
    const successMessage = searchParams.get('success');

    if (successMessage) {
        return (
             <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Pendaftaran Berhasil!</AlertTitle>
                <AlertDescription>
                    {successMessage} Silakan cek inbox email Anda untuk verifikasi.
                </AlertDescription>
             </Alert>
        );
    }
    
    return (
        <>
            <form action={signup} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="anda@email.com"
                    required
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input id="password" name="password" type="password" required />
                </div>
                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}
                <SubmitButton className="w-full bg-primary hover:bg-primary/90">
                    Daftar
                </SubmitButton>
            </form>

            <div className="mt-4 text-center text-sm">
                Sudah punya akun?{' '}
                <Link href="/login" className="underline">
                Masuk di sini
                </Link>
            </div>
        </>
    );
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AppLogo />
          </div>
          <CardTitle className="text-2xl">Buat Akun Baru</CardTitle>
          <CardDescription>
            Isi formulir di bawah ini untuk memulai.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                <SignupContent />
            </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

