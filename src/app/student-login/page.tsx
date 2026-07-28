'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
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
import { studentLogin } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, User, ArrowRight, Shield, QrCode, Delete, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MorphingSpinner } from '@/components/ui/morphing-spinner';


function PinKeypad({ studentName, schoolCode, nis }: { studentName: string, schoolCode: string, nis: string }) {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message');


    const handleKeyPress = (key: string) => {
        if (loading) return;
        if (key === 'backspace') {
            setPin(p => p.slice(0, -1));
        } else if (pin.length < 6) {
            setPin(p => p + key);
        }
    };

    const handleLogin = async () => {
        if (pin.length === 0) {
            setError('PIN tidak boleh kosong.');
            return;
        }
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('school_code', schoolCode);
        formData.append('nis', nis);
        formData.append('pin', pin);

        await studentLogin(formData);
    };

    const pinDisplay = Array(6).fill('●').map((char, i) => (
        <div key={i} className={cn(
            "h-4 w-4 rounded-full transition-all duration-200",
            i < pin.length ? 'bg-primary' : 'bg-gray-300'
        )}></div>
    ));

    const KeypadButton = ({ value, onClick, children }: { value: string; onClick: (val: string) => void; children: React.ReactNode }) => (
        <Button
            type="button"
            variant="ghost"
            className="h-16 w-16 text-2xl font-bold rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200"
            onClick={() => onClick(value)}
            disabled={loading}
        >
            {children}
        </Button>
    );

    return (
        <div className="flex flex-col items-center text-center gap-6">
            <CardTitle className="text-2xl font-bold">Selamat Datang!</CardTitle>
            <CardDescription className="text-muted-foreground -mt-4">
                Masukkan PIN Anda untuk masuk sebagai <br/><span className="font-bold text-primary">{studentName}</span>
            </CardDescription>

            <div className="flex items-center justify-center gap-3 my-4">
                {pinDisplay}
            </div>

            {errorMessage && <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}


            <div className="grid grid-cols-3 gap-4">
                {[...Array(9).keys()].map(i => (
                    <KeypadButton key={i+1} value={(i + 1).toString()} onClick={handleKeyPress}>
                        {i + 1}
                    </KeypadButton>
                ))}
                <div /> 
                <KeypadButton value="0" onClick={handleKeyPress}>0</KeypadButton>
                <KeypadButton value="backspace" onClick={handleKeyPress}>
                    <Delete className="h-6 w-6" />
                </KeypadButton>
            </div>
             <Button className="w-full h-12 bg-primary text-white font-medium group mt-4" onClick={handleLogin} disabled={loading}>
                {loading ? <MorphingSpinner size="sm" className="mr-2" /> : (
                    <span className="flex items-center justify-center gap-2">
                        Masuk
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                )}
            </Button>
             <div className="mt-2 text-center text-sm">
                <Link href="/student-login" className="text-muted-foreground hover:text-primary transition-colors">
                    Bukan Anda? Login manual.
                </Link>
             </div>
        </div>
    );
}

function ManualLoginForm() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message');
    const [manualPin, setManualPin] = useState('');

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Hanya angka dan maksimal 6 digit
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        setManualPin(val);
    };
  
    return (
        <>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <Button variant="outline" className="h-12 text-base" asChild>
                    <Link href="/scan-login">
                        <QrCode className="mr-2 h-5 w-5"/>
                        Scan Login
                    </Link>
                </Button>
                <Button variant="outline" className="h-12 text-base border-primary/20 bg-primary/5 hover:bg-primary/10" asChild>
                    <Link href="/kiosk">
                        <MonitorSmartphone className="mr-2 h-5 w-5 text-primary"/>
                        Mode Kios
                    </Link>
                </Button>
            </div>
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                    Atau login manual
                    </span>
                </div>
            </div>
            <form action={studentLogin} className="space-y-6">
                <div className="space-y-2">
                <Label htmlFor="school_code">Kode Sekolah</Label>
                <div className="relative">
                    <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                    id="school_code"
                    name="school_code"
                    type="text"
                    placeholder="Masukkan kode unik sekolah"
                    className="pl-10 h-12"
                    required
                    />
                </div>
                </div>

                <div className="space-y-2">
                <Label htmlFor="nis">NIS (Nomor Induk Siswa)</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                    id="nis"
                    name="nis"
                    type="text"
                    placeholder="Masukkan NIS Anda"
                    className="pl-10 h-12"
                    required
                    />
                </div>
                </div>
                <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input 
                    id="pin" 
                    name="pin" 
                    type="password"
                    inputMode="numeric"
                    value={manualPin}
                    onChange={handlePinChange}
                    maxLength={6}
                    placeholder="Masukkan PIN Anda"
                    className="pl-10 h-12"
                    required
                    />
                </div>
                </div>

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertDescription>
                        {errorMessage}
                        </AlertDescription>
                    </Alert>
                )}
                
                <SubmitButton className="w-full h-12 bg-primary text-white font-medium group">
                <span className="flex items-center justify-center gap-2">
                    Masuk
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                </SubmitButton>
            </form>
            
            <div className="mt-6 text-center text-sm">
                <Link 
                href="/login" 
                className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
                >
                Login sebagai Guru/Admin
                </Link>
            </div>
        </>
    );
}

function StudentLoginContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const nisFromQR = searchParams.get('nis');
  const schoolCodeFromQR = searchParams.get('school_code');

  const [studentName, setStudentName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState(true);
  
  const isPinMode = nisFromQR && schoolCodeFromQR;

  useEffect(() => {
    if (isPinMode) {
        setLoadingName(true);
        const fetchStudentName = async () => {
            const { data, error } = await supabase
                .from('students')
                .select('name')
                .eq('nis', nisFromQR)
                .single();
            
            if (data) {
                setStudentName(data.name);
            } else {
                setStudentName("Siswa tidak ditemukan"); 
            }
            setLoadingName(false);
        };
        fetchStudentName();
    } else {
        setLoadingName(false);
    }
  }, [isPinMode, nisFromQR, supabase]);

  if (isPinMode) {
     if (loadingName) {
         return (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
                <MorphingSpinner size="md" />
                <p className="text-muted-foreground">Mencari data siswa...</p>
            </div>
         );
     }
     if (studentName) {
        return <PinKeypad studentName={studentName} schoolCode={schoolCodeFromQR} nis={nisFromQR} />;
     }
     return <ManualLoginForm />;
  }

  return <ManualLoginForm />;
}
  
export default function StudentLoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card>
          <CardHeader className="text-center pb-6">
             <div className="mb-6 flex justify-center">
                <AppLogo />
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <MorphingSpinner size="md" />
              </div>
            }>
              <StudentLoginContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
