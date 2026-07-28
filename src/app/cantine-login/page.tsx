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
import { cantineLogin } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, ArrowRight, Shield, UtensilsCrossed, Store } from 'lucide-react';
import { MorphingSpinner } from '@/components/ui/morphing-spinner';

function CantineLoginForm() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message');
    const [pin, setPin] = useState('');

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center gap-2 mb-2">
                <div className="p-3 bg-orange-100 rounded-2xl">
                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold">Akses Outlet Kantin</h2>
                <p className="text-xs text-muted-foreground text-center">Gunakan ID Kantin dan PIN yang diberikan oleh Guru/Admin sekolah.</p>
            </div>

            <form action={cantineLogin} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="school_code">Kode Sekolah</Label>
                    <div className="relative">
                        <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="school_code"
                            name="school_code"
                            type="text"
                            placeholder="Misal: al-ikhlas"
                            className="pl-10 h-12"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cantine_id">ID Kantin / Nama Outlet</Label>
                    <div className="relative">
                        <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            id="cantine_id"
                            name="cantine_id"
                            type="text"
                            placeholder="Misal: kantin1"
                            className="pl-10 h-12"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="pin">PIN Keamanan</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input 
                            id="pin" 
                            name="pin" 
                            type="password"
                            inputMode="numeric"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            placeholder="Masukkan PIN"
                            className="pl-10 h-12"
                            required
                        />
                    </div>
                </div>

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}
                
                <SubmitButton className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-100">
                    <span className="flex items-center justify-center gap-2">
                        Masuk Ke Outlet
                        <ArrowRight className="h-4 w-4" />
                    </span>
                </SubmitButton>
            </form>
            
            <div className="mt-6 text-center text-sm">
                <Link 
                    href="/login" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                >
                    Login sebagai Guru
                </Link>
            </div>
        </div>
    );
}

export default function CantineLoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-orange-600 h-2 w-full" />
          <CardHeader className="text-center pb-2">
             <div className="mb-4 flex justify-center">
                <AppLogo />
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <MorphingSpinner size="md" />
              </div>
            }>
              <CantineLoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
