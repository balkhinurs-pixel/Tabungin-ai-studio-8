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
import { login, loginWithGoogle } from './actions';
import { SubmitButton } from '@/components/SubmitButton';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, ArrowRight, User, MonitorSmartphone, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { MorphingSpinner } from '@/components/ui/morphing-spinner';

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

function LoginContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <form action={login} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alamat Email (Guru/Admin)
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Masukkan alamat email Anda"
              className="pl-10 h-12 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Kata Sandi
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input 
              id="password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Masukkan kata sandi Anda"
              className="pl-10 pr-10 h-12 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
              Ingat saya
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Lupa kata sandi?
          </Link>
        </div>

        {errorMessage && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertDescription className="text-red-700 dark:text-red-400">
                  {errorMessage}
                </AlertDescription>
            </Alert>
        )}
        
        <SubmitButton className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group">
          <span className="flex items-center justify-center gap-2">
            Masuk
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </SubmitButton>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400 font-medium">
            Atau lanjutkan dengan
            </span>
        </div>
      </div>
    
      <form action={loginWithGoogle}>
          <Button 
            variant="outline" 
            className="w-full h-12 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 group"
          >
              <GoogleIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
              Lanjutkan dengan Google
          </Button>
      </form>
      
      <Separator className="my-8" />
      
      <div className="space-y-4 text-center">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="secondary" className="h-12 w-full" asChild>
                <Link href="/student-login">
                    <User className="mr-2 h-4 w-4" /> Login Siswa
                </Link>
            </Button>
            <Button variant="secondary" className="h-12 w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border-none" asChild>
                <Link href="/cantine-login">
                    <UtensilsCrossed className="mr-2 h-4 w-4" /> Login Kantin
                </Link>
            </Button>
            <Button variant="outline" className="h-12 w-full border-primary/20 hover:bg-primary/5" asChild>
                <Link href="/kiosk">
                    <MonitorSmartphone className="mr-2 h-4 w-4 text-primary" /> Mode Kios
                </Link>
            </Button>
         </div>
         <p className="text-sm text-muted-foreground">Belum punya akun guru?{' '}
            <Link href="/signup" className="text-primary hover:underline">
                Daftar di sini
            </Link>
         </p>
      </div>

    </>
  );
}
  
export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20 dark:border-gray-700/50 shadow-2xl shadow-black/10 dark:shadow-black/50">
          <CardHeader className="text-center pb-6">
            <div className="mb-6 flex justify-center">
              <AppLogo />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Selamat Datang
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Masuk ke akun Anda untuk melanjutkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <MorphingSpinner size="md" />
              </div>
            }>
              <LoginContent />
            </Suspense>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dilindungi oleh enkripsi standar industri
          </p>
        </div>
      </div>
    </main>
  );
}
