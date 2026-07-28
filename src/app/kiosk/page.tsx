
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ScanLine, 
  ArrowLeft, 
  Wallet, 
  Loader2, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Banknote,
  KeyRound,
  Delete,
  ArrowRight,
  XCircle,
  ReceiptText,
  Info
} from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getStudentKioskData, processKioskWithdrawal } from './actions';

type KioskState = 'SCANNING' | 'MAIN_MENU' | 'PIN_INPUT' | 'WITHDRAW_MENU' | 'CUSTOM_AMOUNT' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingRef = useRef(false); 
  const streamRef = useRef<MediaStream | null>(null);
  
  // States
  const [kioskState, setKioskState] = useState<KioskState>('SCANNING');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [student, setStudent] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastWithdrawal, setLastWithdrawal] = useState<number | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);

  const { toast } = useToast();

  // Reset Timer - kembali ke scan jika ditinggalkan
  useEffect(() => {
    if (kioskState !== 'SCANNING') {
        const timeout = setTimeout(() => {
            handleReset();
        }, 30000); // 30 detik tanpa aktivitas
        return () => clearTimeout(timeout);
    }
  }, [kioskState]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        // Hentikan stream yang ada sebelum memulai yang baru
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Gunakan ideal constraints agar lebih stabil di berbagai hardware (termasuk laptop)
        const constraints = {
            video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Penanganan jika stream terputus di tengah jalan
          stream.getTracks().forEach(track => {
            track.onended = () => {
                if (kioskState === 'SCANNING') {
                    setCameraRetryCount(prev => prev + 1);
                }
            };
          });
        }
      } catch (error: any) {
        console.error('Error inisialisasi kamera:', error);
        setHasCameraPermission(false);
        // Jangan tampilkan toast berulang kali jika user menolak secara sengaja
      }
    };

    if (kioskState === 'SCANNING') {
        getCameraPermission();
    }

    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
  }, [facingMode, kioskState, cameraRetryCount]);

  useEffect(() => {
    let animationFrameId: number;
    let lastScanTime = 0;

    const tick = (time: number) => {
      // Throttle: Hanya lakukan pemindaian setiap 150ms untuk menghemat daya & mencegah kedipan
      if (time - lastScanTime < 150) {
          animationFrameId = requestAnimationFrame(tick);
          return;
      }
      lastScanTime = time;

      if (kioskState === 'SCANNING' && !processingRef.current && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        if (context) {
            // Ukuran pemrosesan yang lebih kecil agar ringan di laptop
            const processWidth = 480;
            const processHeight = Math.floor((video.videoHeight / video.videoWidth) * processWidth);
            
            canvas.width = processWidth;
            canvas.height = processHeight;

            // Handle mirroring hanya untuk tampilan 'user' tanpa membebani render
            context.setTransform(1, 0, 0, 1, 0, 0);
            if (facingMode === 'user') {
                context.translate(processWidth, 0);
                context.scale(-1, 1);
            }
            
            context.drawImage(video, 0, 0, processWidth, processHeight);

            const imageData = context.getImageData(0, 0, processWidth, processHeight);
            const code = jsQR(imageData.data, processWidth, processHeight, {
                inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
                processingRef.current = true; 
                handleScanResult(code.data);
            }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (hasCameraPermission && kioskState === 'SCANNING') {
       animationFrameId = requestAnimationFrame(tick);
    }
   
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, facingMode, kioskState]);

  const handleScanResult = async (data: string) => {
    if (!data.includes(',')) {
        setTimeout(() => { processingRef.current = false; }, 1000);
        return;
    }

    const [nis, schoolCode] = data.split(',');
    if (!nis || !schoolCode) {
        setTimeout(() => { processingRef.current = false; }, 1000);
        return;
    }

    const result = await getStudentKioskData(nis, schoolCode);

    if (result.success && result.data) {
        setStudent(result.data);
        setKioskState('MAIN_MENU');
        processingRef.current = false;
    } else {
        toast({
            title: "Kartu Tidak Terdaftar",
            description: result.message || "Data siswa tidak ditemukan.",
            variant: "destructive"
        });
        setTimeout(() => { processingRef.current = false; }, 3000);
    }
  };

  const handlePinPress = (num: string) => {
    if (pin.length < 6) {
        setPin(prev => prev + num);
    }
  };

  const handleWithdraw = async (withAmount: number) => {
    setKioskState('PROCESSING');
    
    const result = await processKioskWithdrawal({
        studentId: student.id,
        nis: student.nis,
        schoolCode: student.schoolCode,
        pin: pin,
        amount: withAmount
    });

    if (result.success) {
        setLastWithdrawal(withAmount);
        setStudent({ ...student, balance: result.newBalance });
        setKioskState('SUCCESS');
        setTimeout(() => handleReset(), 10000);
    } else {
        setErrorMessage(result.message || 'Gagal memproses transaksi.');
        setKioskState('ERROR');
    }
  };

  const handleReset = () => {
    setKioskState('SCANNING');
    setStudent(null);
    setPin('');
    setAmount(0);
    setErrorMessage('');
    setLastWithdrawal(null);
    processingRef.current = false;
  };

  const formatCurrency = (val: number) => 
    val.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

  const NumericKeypad = ({ onConfirm, confirmLabel = "Lanjutkan" }: { onConfirm: () => void, confirmLabel?: string }) => (
    <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex gap-2 my-2 h-5">
            {[...Array(6)].map((_, i) => (
                <div key={i} className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-200",
                    i < pin.length ? "bg-white border-white shadow-[0_0_10px_white]" : "border-white/20"
                )} />
            ))}
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <Button 
                    key={num} 
                    variant="outline" 
                    className="h-16 text-2xl font-black rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
                    onClick={() => handlePinPress(num.toString())}
                >
                    {num}
                </Button>
            ))}
            <Button 
                variant="outline" 
                className="h-16 rounded-2xl bg-rose-500/10 border-rose-500/20 text-rose-300"
                onClick={() => setPin('')}
            >
                <XCircle className="h-6 w-6" />
            </Button>
            <Button 
                variant="outline" 
                className="h-16 text-2xl font-black rounded-2xl bg-white/5 border-white/10 text-white"
                onClick={() => handlePinPress('0')}
            >
                0
            </Button>
            <Button 
                variant="outline" 
                className="h-16 rounded-2xl bg-white/5 border-white/10 text-white"
                onClick={() => setPin(p => p.slice(0, -1))}
            >
                <Delete className="h-6 w-6" />
            </Button>
        </div>
        <Button 
            className="w-full max-w-[320px] h-16 rounded-2xl bg-white text-primary font-black text-lg shadow-xl mt-4"
            disabled={pin.length < 6}
            onClick={onConfirm}
        >
            {confirmLabel} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        {/* Layer Video Latar Belakang */}
        <div className="absolute inset-0 z-0">
             <video 
                ref={videoRef} 
                className={cn(
                    "w-full h-full object-cover opacity-60 transition-all duration-1000",
                    facingMode === 'user' && "-scale-x-100",
                    (kioskState !== 'SCANNING') && "blur-[100px] opacity-30 scale-125"
                )} 
                autoPlay 
                playsInline 
                muted 
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70" />
        </div>

        {/* UI Kepala */}
        <div className="relative z-10 p-6 flex justify-between items-center">
            <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tighter text-white">
                    Tabung<span className="text-primary">.in</span> <span className="opacity-40 text-xs font-bold uppercase tracking-[0.2em]">ATM Kiosk</span>
                </h1>
            </div>
            {kioskState === 'SCANNING' && (
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-white/60 text-[11px] font-bold rounded-full h-10 px-4 bg-white/10 border border-white/10" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Ganti Kamera
                    </Button>
                    <Button variant="ghost" className="text-white/60 text-[11px] font-bold rounded-full h-10 px-4 bg-white/10 border border-white/10" asChild>
                        <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Keluar</Link>
                    </Button>
                </div>
            )}
        </div>

        {/* AREA KONTEN UTAMA */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
            
            {/* 1. STATE: SCANNING */}
            {kioskState === 'SCANNING' && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
                    <div className="relative w-72 h-72 sm:w-96 sm:h-96 border border-white/10 rounded-[4rem] flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary rounded-tl-[4rem]" />
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary rounded-tr-[4rem]" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary rounded-bl-[4rem]" />
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary rounded-br-[4rem]" />
                        
                        <div className="absolute w-full h-1.5 bg-primary/80 shadow-[0_0_25px_rgba(59,130,246,1)] animate-[bounce_2.5s_infinite]" />
                        
                        <div className="flex flex-col items-center gap-4 text-white/10">
                            <Wallet className="h-16 w-16" />
                            <p className="text-[12px] font-black text-center px-12 leading-relaxed uppercase tracking-[0.4em]">Tempelkan Kartu QR</p>
                        </div>
                    </div>
                    
                    <div className="mt-12 text-center space-y-6">
                        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-primary/10 border border-primary/20 rounded-full">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <p className="text-primary font-black text-[11px] uppercase tracking-widest">Sistem Siap Digunakan</p>
                        </div>
                        
                        <div className="flex items-center gap-4 px-8 py-4 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl max-w-xs mx-auto">
                            <Info className="h-6 w-6 text-primary shrink-0" />
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-relaxed text-left">
                                Arahkan Kode QR ke arah <br/> kamera dengan jarak ±15cm
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. STATE: MAIN MENU */}
            {kioskState === 'MAIN_MENU' && student && (
                <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-12 duration-500">
                    <Card className="bg-gradient-to-br from-primary via-blue-600 to-blue-900 border-none shadow-2xl rounded-[3rem] overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                        <CardContent className="p-10 flex flex-col items-center text-center relative z-10">
                            <div className="bg-white/20 p-4 rounded-full mb-6 backdrop-blur-md border border-white/20">
                                <CheckCircle2 className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">{student.name}</h2>
                            <p className="text-white/60 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Informasi Akun Siswa</p>
                            
                            <div className="w-full bg-white/10 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-inner">
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Total Saldo Tersedia</p>
                                <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(student.balance)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            className="h-20 rounded-[2rem] bg-white/10 border border-white/20 text-white text-lg font-black hover:bg-white/20 shadow-xl"
                            onClick={() => handleReset()}
                        >
                            Selesai
                        </Button>
                        <Button 
                            className="h-20 rounded-[2rem] bg-white text-primary text-lg font-black shadow-2xl shadow-primary/30 border-b-4 border-blue-100"
                            onClick={() => setKioskState('PIN_INPUT')}
                        >
                            Tarik Tunai
                        </Button>
                    </div>
                </div>
            )}

            {/* 3. STATE: PIN INPUT */}
            {kioskState === 'PIN_INPUT' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-8 animate-in fade-in duration-300">
                    <div className="text-center space-y-3">
                        <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                            <KeyRound className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">PIN KEAMANAN</h2>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest px-12 leading-relaxed">
                            Masukkan 6 digit kode keamanan <br/> untuk melanjutkan penarikan.
                        </p>
                    </div>
                    <NumericKeypad onConfirm={() => setKioskState('WITHDRAW_MENU')} />
                    <Button variant="ghost" className="text-white/20 text-xs font-bold hover:text-white uppercase tracking-widest h-12" onClick={() => setKioskState('MAIN_MENU')}>
                        Batal
                    </Button>
                </div>
            )}

            {/* 4. STATE: WITHDRAW MENU */}
            {kioskState === 'WITHDRAW_MENU' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-8 animate-in slide-in-from-right-12 duration-500">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">Pilih Nominal</h2>
                        <p className="text-white/30 text-[11px] font-black tracking-[0.2em] uppercase">Maksimal: {formatCurrency(student.balance)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        {QUICK_AMOUNTS.map(amt => (
                            <Button 
                                key={amt}
                                disabled={amt > student.balance}
                                className="h-28 rounded-[2.5rem] bg-white/10 border border-white/20 text-white text-2xl font-black hover:bg-white shadow-2xl hover:text-primary transition-all active:scale-90 disabled:opacity-20"
                                onClick={() => handleWithdraw(amt)}
                            >
                                {amt.toLocaleString('id-ID')}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-4 w-full">
                        <Button 
                            variant="outline" 
                            className="flex-1 h-20 rounded-[2rem] bg-white/5 border-white/10 text-white font-black text-base uppercase"
                            onClick={() => setKioskState('PIN_INPUT')}
                        >
                            Kembali
                        </Button>
                        <Button 
                            className="flex-1 h-20 rounded-[2rem] bg-primary text-white font-black text-base uppercase shadow-xl"
                            onClick={() => setKioskState('CUSTOM_AMOUNT')}
                        >
                            Nominal Lain
                        </Button>
                    </div>
                </div>
            )}

            {/* 5. STATE: CUSTOM AMOUNT */}
            {kioskState === 'CUSTOM_AMOUNT' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-8">
                     <div className="text-center w-full">
                        <h2 className="text-2xl font-black text-white tracking-tight mb-4 uppercase">Input Manual</h2>
                        <div className="bg-white/10 p-8 rounded-[2.5rem] border border-white/20 w-full text-center shadow-inner">
                            <p className="text-primary-foreground/30 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Jumlah Yang Akan Ditarik</p>
                            <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(amount)}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-[340px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                            <Button 
                                key={num}
                                variant="outline" 
                                className={cn(
                                    "h-16 text-2xl font-black rounded-2xl bg-white/5 border-white/10 text-white",
                                    num === 0 && "col-span-2"
                                )}
                                onClick={() => setAmount(prev => parseInt(`${prev}${num}`))}
                            >
                                {num}
                            </Button>
                        ))}
                         <Button 
                            variant="outline" 
                            className="h-16 rounded-2xl bg-white/5 border-white/10 text-white"
                            onClick={() => setAmount(0)}
                        >
                            <Delete className="h-7 w-7" />
                        </Button>
                    </div>
                    <div className="flex gap-4 w-full">
                         <Button 
                            variant="ghost" 
                            className="flex-1 h-16 rounded-[2rem] text-white/30 font-bold uppercase tracking-widest"
                            onClick={() => { setAmount(0); setKioskState('WITHDRAW_MENU'); }}
                        >
                            Batal
                        </Button>
                        <Button 
                            className="flex-1 h-16 rounded-[2rem] bg-white text-primary font-black text-lg shadow-2xl"
                            disabled={amount <= 0 || amount > student.balance}
                            onClick={() => handleWithdraw(amount)}
                        >
                            TARIK DANA
                        </Button>
                    </div>
                </div>
            )}

            {/* 6. STATE: PROCESSING */}
            {kioskState === 'PROCESSING' && (
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="h-24 w-24 border-8 border-white/10 rounded-full" />
                        <div className="h-24 w-24 border-8 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-[0.3em] uppercase animate-pulse italic">Memproses</h2>
                        <p className="text-white/30 font-bold uppercase tracking-[0.4em] text-[11px]">Verifikasi Transaksi Aman</p>
                    </div>
                </div>
            )}

            {/* 7. STATE: SUCCESS */}
            {kioskState === 'SUCCESS' && (
                <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
                    <Card className="bg-white border-none shadow-2xl rounded-[3.5rem] overflow-hidden">
                        <CardContent className="p-0">
                            <div className="bg-emerald-500 p-12 flex flex-col items-center text-white text-center">
                                <div className="bg-white/20 p-5 rounded-full mb-6 shadow-lg">
                                    <CheckCircle2 className="h-10 w-10 text-white" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">BERHASIL!</h2>
                                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest opacity-80">Ambil Struk & Dana Anda</p>
                            </div>
                            <div className="p-10 space-y-6">
                                <div className="flex flex-col items-center py-6 border-b-2 border-dashed border-gray-100">
                                    <ReceiptText className="h-6 w-6 text-gray-300 mb-3" />
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2">Dana Yang Ditarik</p>
                                    <p className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(lastWithdrawal || 0)}</p>
                                </div>
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                        <span className="uppercase tracking-[0.2em] text-[10px] text-gray-400">Sisa Saldo</span>
                                        <span className="text-emerald-600 font-black text-lg">{formatCurrency(student.balance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                        <span className="uppercase tracking-[0.2em] text-[10px] text-gray-400">Nama Siswa</span>
                                        <span className="text-gray-900 font-black truncate max-w-[180px] uppercase">{student.name}</span>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-18 rounded-[2.5rem] bg-gray-900 text-white font-black text-lg shadow-2xl mt-6 transition-transform active:scale-95"
                                    onClick={() => handleReset()}
                                >
                                    Selesai
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 8. STATE: ERROR */}
            {kioskState === 'ERROR' && (
                <div className="w-full max-w-md animate-in shake-in duration-500">
                    <Card className="bg-rose-600 border-none shadow-2xl rounded-[3rem] overflow-hidden text-center text-white">
                        <CardContent className="p-10 flex flex-col items-center">
                            <div className="bg-white/20 p-5 rounded-full mb-8 shadow-inner">
                                <AlertCircle className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight mb-4 uppercase">GAGAL!</h2>
                            <p className="text-rose-100 font-bold mb-10 text-sm leading-relaxed px-6 uppercase tracking-wider">{errorMessage}</p>
                            <Button 
                                className="w-full h-20 rounded-[2rem] bg-white text-rose-600 font-black text-lg shadow-2xl active:scale-95 transition-all"
                                onClick={() => setKioskState('PIN_INPUT')}
                            >
                                COBA LAGI
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full h-14 mt-4 text-white/40 text-[11px] font-black uppercase tracking-widest hover:text-white"
                                onClick={() => handleReset()}
                            >
                                Kembali ke Awal
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>

        {/* UI Galat Akses Kamera */}
        {hasCameraPermission === false && (
            <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-10 text-center">
                 <div className="bg-rose-500/10 p-8 rounded-full mb-8 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                    <AlertCircle className="h-16 w-16 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Kamera Bermasalah</h2>
                <p className="text-white/40 mb-12 max-sm:px-4 max-w-xs text-sm leading-relaxed font-medium">
                    Kami tidak dapat mengakses kamera. Pastikan izin kamera aktif dan perangkat tidak sedang digunakan aplikasi lain.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <Button variant="outline" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="rounded-2xl h-16 bg-white/5 border-white/10 text-white font-bold">
                        Coba Kamera Lain
                    </Button>
                    <Button onClick={() => window.location.reload()} className="rounded-2xl h-16 px-10 text-lg font-black bg-white text-black shadow-2xl">
                        Segarkan Halaman
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
}
