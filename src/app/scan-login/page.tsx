
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, ArrowLeft } from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function ScanLoginPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Izin Kamera Ditolak',
          description: 'Mohon aktifkan izin kamera di pengaturan browser Anda.',
        });
      }
    };

    getCameraPermission();

    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [toast]);

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                setScanResult(code.data);
            }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (hasCameraPermission && !scanResult) {
       animationFrameId = requestAnimationFrame(tick);
    }
   
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, scanResult]);

  useEffect(() => {
    if(scanResult) {
        const [nis, schoolCode] = scanResult.split(',');

        if (!nis || !schoolCode) {
             toast({
                title: 'Kode QR Tidak Valid',
                description: 'Format kode QR tidak dikenali. Pastikan kartu Anda adalah versi terbaru.',
                variant: 'destructive',
            });
            setTimeout(() => setScanResult(null), 3000); // Reset after 3 seconds
            return;
        }
        
        toast({
            title: 'QR Terbaca',
            description: 'Mengalihkan ke halaman login...',
        });
        
        const params = new URLSearchParams({ nis, school_code: schoolCode });
        router.push(`/student-login?${params.toString()}`);
    }
  }, [scanResult, router, toast]);


  return (
    <div className="flex flex-col gap-8 items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
             <h2 className="text-2xl font-bold tracking-tight">Pindai QR untuk Login</h2>
            <p className="text-muted-foreground max-w-xs">
                Arahkan kamera ke kode QR yang ada di kartu siswa Anda.
            </p>
        </div>
        
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-4 border-dashed">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <ScanLine className="absolute h-full w-full text-primary animate-pulse" />
            <canvas ref={canvasRef} className="hidden" />
        </div>

        <Button variant="outline" asChild>
            <Link href="/student-login">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Login Manual
            </Link>
        </Button>

        {hasCameraPermission === false && (
            <Alert variant="destructive" className="max-w-xs">
                <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
                <AlertDescription>
                Mohon izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur ini.
                </AlertDescription>
            </Alert>
        )}
    </div>
  );
}
