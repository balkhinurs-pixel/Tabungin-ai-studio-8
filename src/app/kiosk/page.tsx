
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
  Info,
  QrCode,
  Usb,
  Keyboard,
  Volume2,
  Coins,
  Calculator,
  Building2
} from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getStudentKioskData, processKioskWithdrawal } from './actions';
import KioskSettlementModal from './components/KioskSettlementModal';

type KioskState = 'SCANNING' | 'MAIN_MENU' | 'PIN_INPUT' | 'WITHDRAW_MENU' | 'CUSTOM_AMOUNT' | 'REASON_SELECTION' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

const PRESET_REASONS = [
  { label: 'Uang Saku / Jajan', icon: '🍔' },
  { label: 'Beli Alat Tulis', icon: '✏️' },
  { label: 'Ongkos Pulang', icon: '🚌' },
  { label: 'Iuran / Kegiatan', icon: '📋' },
  { label: 'Kebutuhan Sekolah', icon: '🎒' },
  { label: 'Lainnya', icon: '💬' },
];

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingRef = useRef(false); 
  const streamRef = useRef<MediaStream | null>(null);
  
  // States
  const [kioskState, setKioskState] = useState<KioskState>('SCANNING');
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [student, setStudent] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('Uang Saku / Jajan');
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastWithdrawal, setLastWithdrawal] = useState<number | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);

  // Cashcow USB Scanner Buffer Refs & States
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const [isCashcowReading, setIsCashcowReading] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualNis, setManualNis] = useState('');
  const [manualSchoolCode, setManualSchoolCode] = useState('');
  const [activeScanMode, setActiveScanMode] = useState<'DEVICE' | 'CAMERA'>('DEVICE');
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const [deviceInputVal, setDeviceInputVal] = useState('');

  // Persistent Kiosk School Code filter
  const [savedSchoolCode, setSavedSchoolCode] = useState('');
  const [isSchoolCodeModalOpen, setIsSchoolCodeModalOpen] = useState(false);
  const [tempSchoolCodeInput, setTempSchoolCodeInput] = useState('');

  // Load persistent scan mode & school code from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('kiosk_scan_mode');
    if (savedMode === 'CAMERA' || savedMode === 'DEVICE') {
      setActiveScanMode(savedMode);
    }
    const savedCode = localStorage.getItem('kiosk_school_code');
    if (savedCode) {
      setSavedSchoolCode(savedCode.trim().toLowerCase());
    }
  }, []);

  const handleSaveSchoolCode = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    setSavedSchoolCode(trimmed);
    if (trimmed) {
      localStorage.setItem('kiosk_school_code', trimmed);
    } else {
      localStorage.removeItem('kiosk_school_code');
    }
    setIsSchoolCodeModalOpen(false);
    toast({
      title: trimmed ? "Filter Kode Sekolah Tersimpan" : "Filter Kode Sekolah Dihapus",
      description: trimmed 
        ? `Kios sekarang terikat khusus ke sekolah dengan kode: ${trimmed.toUpperCase()}` 
        : "Pencarian siswa sekarang mencakup seluruh database.",
    });
  };

  const handleModeChange = (mode: 'DEVICE' | 'CAMERA') => {
    setActiveScanMode(mode);
    localStorage.setItem('kiosk_scan_mode', mode);
  };

  // Continuous Auto-Focus for Device Input in DEVICE mode (Android/iOS Bluetooth wedge friendly)
  useEffect(() => {
    if (kioskState === 'SCANNING' && activeScanMode === 'DEVICE' && !manualInputOpen) {
      const timer = setInterval(() => {
        if (document.activeElement !== deviceInputRef.current && !manualInputOpen) {
          deviceInputRef.current?.focus();
        }
      }, 400);
      deviceInputRef.current?.focus();
      return () => clearInterval(timer);
    }
  }, [kioskState, activeScanMode, manualInputOpen]);

  const { toast } = useToast();

  // Audio Beep generator function for Cashcow / Camera scan
  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('Audio beep error:', e);
    }
  };

  // Keyboard wedge listener for Cashcow USB Scanner Device
  useEffect(() => {
    if (kioskState !== 'SCANNING') return; // Only listen in SCANNING state

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const targetTag = target?.tagName?.toUpperCase();
      
      // Do not intercept if student is explicitly typing in text inputs (except in SCANNING state)
      if (kioskState !== 'SCANNING' && (targetTag === 'INPUT' || targetTag === 'TEXTAREA')) {
        return;
      }
      if (manualInputOpen) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer if key gap > 350ms (unless it's Enter)
      if (timeDiff > 350 && e.key !== 'Enter') {
        scanBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (scanBufferRef.current.trim().length > 0) {
          const scannedData = scanBufferRef.current.trim();
          scanBufferRef.current = '';
          e.preventDefault();
          e.stopPropagation();

          if (!processingRef.current) {
            processingRef.current = true;
            setIsCashcowReading(true);
            handleScanResult(scannedData);
          }
        }
      } else if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        setIsCashcowReading(true);
        const timer = setTimeout(() => setIsCashcowReading(false), 800);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [kioskState, manualInputOpen]);

  // Dedicated listener for PIN & Custom Amount external keyboard/numpad input
  useEffect(() => {
    if (kioskState === 'SCANNING') return;
    if (isSettlementOpen || isSchoolCodeModalOpen) return;

    const handleKioskKeyboardInput = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const targetTag = target?.tagName?.toUpperCase();
      
      // Ignore if user is actively typing in a standard input (except if we want manual kiosk keys)
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }

      const key = e.key;

      if (kioskState === 'PIN_INPUT') {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          if (pin.length < 6) {
            setPin(prev => prev + key);
          }
        } else if (key === 'Backspace') {
          e.preventDefault();
          setPin(prev => prev.slice(0, -1));
        } else if (key === 'Delete' || key === 'Escape') {
          e.preventDefault();
          setPin('');
        } else if (key === 'Enter') {
          e.preventDefault();
          if (pin.length === 6) {
            setKioskState('WITHDRAW_MENU');
          }
        }
      }

      else if (kioskState === 'CUSTOM_AMOUNT') {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault();
          setAmount(prev => {
            const nextVal = parseInt(`${prev}${key}`);
            if (isNaN(nextVal)) return prev;
            if (nextVal > (student?.balance || 0)) return prev;
            return nextVal;
          });
        } else if (key === 'Backspace') {
          e.preventDefault();
          setAmount(prev => {
            const s = prev.toString();
            return s.length <= 1 ? 0 : parseInt(s.slice(0, -1));
          });
        } else if (key === 'Delete' || key === 'Escape') {
          e.preventDefault();
          setAmount(0);
        } else if (key === 'Enter') {
          e.preventDefault();
          if (amount > 0 && amount <= (student?.balance || 0)) {
            setReason('Uang Saku / Jajan');
            setIsCustomReason(false);
            setKioskState('REASON_SELECTION');
          }
        }
      }

      else if (kioskState === 'MAIN_MENU') {
        if (key === 'Escape') {
          e.preventDefault();
          handleReset();
        } else if (key === 'Enter') {
          e.preventDefault();
          setKioskState('PIN_INPUT');
        }
      }

      else if (kioskState === 'WITHDRAW_MENU') {
        if (key === 'Escape') {
          e.preventDefault();
          setKioskState('PIN_INPUT');
        } else if (/^[1-4]$/.test(key)) {
          e.preventDefault();
          const index = parseInt(key) - 1;
          const selectedAmt = QUICK_AMOUNTS[index];
          if (selectedAmt && selectedAmt <= (student?.balance || 0)) {
            setAmount(selectedAmt);
            setReason('Uang Saku / Jajan');
            setIsCustomReason(false);
            setKioskState('REASON_SELECTION');
          }
        } else if (key === 'Enter') {
          e.preventDefault();
          setKioskState('CUSTOM_AMOUNT');
        }
      }

      else if (kioskState === 'REASON_SELECTION') {
        if (key === 'Escape') {
          e.preventDefault();
          setKioskState('WITHDRAW_MENU');
        } else if (/^[1-6]$/.test(key)) {
          e.preventDefault();
          const index = parseInt(key) - 1;
          const preset = PRESET_REASONS[index];
          if (preset) {
            if (preset.label === 'Lainnya') {
              setIsCustomReason(true);
              setReason('');
            } else {
              setIsCustomReason(false);
              setReason(preset.label);
            }
          }
        } else if (key === 'Enter') {
          e.preventDefault();
          if (reason.trim()) {
            handleWithdraw(amount, reason);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKioskKeyboardInput, true);
    return () => {
      window.removeEventListener('keydown', handleKioskKeyboardInput, true);
    };
  }, [kioskState, pin, amount, student, reason, isCustomReason, isSettlementOpen, isSchoolCodeModalOpen]);

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
    let isCancelled = false;

    const getCameraPermission = async () => {
      try {
        // Hentikan stream yang ada sebelum memulai yang baru
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          streamRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        // Delay singkat agar hardware kamera di Android/iOS sempat rilis bersih
        await new Promise(resolve => setTimeout(resolve, 80));
        if (isCancelled) return;

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode === 'user' ? 'user' : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr) {
          console.warn('FacingMode constraint gagal, mencoba fallback standar:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));

          stream.getTracks().forEach(track => {
            track.onended = () => {
              if (!isCancelled && kioskState === 'SCANNING' && activeScanMode === 'CAMERA') {
                setCameraRetryCount(prev => prev + 1);
              }
            };
          });
        }
      } catch (error: any) {
        console.error('Error inisialisasi kamera:', error);
        if (!isCancelled) {
          setHasCameraPermission(false);
          toast({
            title: "Gagal Mengakses Kamera",
            description: "Pastikan izin kamera telah diberikan di browser HP / Laptop Anda.",
            variant: "destructive"
          });
        }
      }
    };

    if (kioskState === 'SCANNING' && activeScanMode === 'CAMERA') {
      getCameraPermission();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [facingMode, kioskState, cameraRetryCount, activeScanMode]);

  useEffect(() => {
    let animationFrameId: number;
    let lastScanTime = 0;

    const tick = (time: number) => {
      // Throttle pemindaian 130ms (sekitar 8 fps) agar sangat ringan di HP/Laptop tanpa overheating
      if (time - lastScanTime < 130) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      lastScanTime = time;

      if (
        kioskState === 'SCANNING' && 
        activeScanMode === 'CAMERA' && 
        !processingRef.current && 
        videoRef.current && 
        videoRef.current.readyState >= 2 && 
        canvasRef.current
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (context && video.videoWidth > 0 && video.videoHeight > 0) {
          // Downscale resolusi parsing jsQR ke 360px agar pemrosesan super cepat
          const processWidth = 360;
          const processHeight = Math.floor((video.videoHeight / video.videoWidth) * processWidth);

          if (canvas.width !== processWidth || canvas.height !== processHeight) {
            canvas.width = processWidth;
            canvas.height = processHeight;
          }

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

    if (hasCameraPermission && kioskState === 'SCANNING' && activeScanMode === 'CAMERA') {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, facingMode, kioskState, activeScanMode]);

  const handleScanResult = async (rawData: string) => {
    const data = rawData.trim();
    if (!data) {
        setTimeout(() => { processingRef.current = false; setIsCashcowReading(false); }, 1000);
        return;
    }

    let nis = '';
    let schoolCode = '';

    if (data.includes(',')) {
        const parts = data.split(',');
        nis = parts[0]?.trim() || '';
        schoolCode = parts[1]?.trim() || '';
    } else {
        nis = data;
        schoolCode = savedSchoolCode;
    }

    if (!schoolCode && savedSchoolCode) {
        schoolCode = savedSchoolCode;
    }

    if (!nis) {
        setTimeout(() => { processingRef.current = false; setIsCashcowReading(false); }, 1000);
        return;
    }

    const result = await getStudentKioskData(nis, schoolCode);

    if (result.success && result.data) {
        playBeep('success');
        setStudent(result.data);
        setKioskState('MAIN_MENU');
        processingRef.current = false;
        setIsCashcowReading(false);
    } else {
        playBeep('error');
        setIsCashcowReading(false);
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

  const handleWithdraw = async (withAmount: number, withDescription?: string) => {
    setKioskState('PROCESSING');
    
    const targetDesc = withDescription !== undefined ? withDescription : reason;

    const result = await processKioskWithdrawal({
        studentId: student.id,
        nis: student.nis,
        schoolCode: student.schoolCode,
        pin: pin,
        amount: withAmount,
        description: targetDesc
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
    setReason('Uang Saku / Jajan');
    setIsCustomReason(false);
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
                    "w-full h-full object-cover transition-all duration-500",
                    facingMode === 'user' && "-scale-x-100",
                    kioskState === 'SCANNING' && activeScanMode === 'CAMERA'
                      ? "opacity-100 blur-0 scale-100"
                      : "blur-[100px] opacity-20 scale-125"
                )} 
                autoPlay 
                playsInline 
                muted 
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className={cn(
              "absolute inset-0 transition-opacity duration-500 pointer-events-none",
              activeScanMode === 'CAMERA' && kioskState === 'SCANNING'
                ? "bg-gradient-to-t from-black/80 via-transparent to-black/80"
                : "bg-gradient-to-t from-black via-black/60 to-black/90"
            )} />
        </div>

        {/* UI Kepala */}
        <div className="relative z-10 p-3.5 sm:p-6 flex justify-between items-center gap-2">
            <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-black tracking-tighter text-white">
                    Tabung<span className="text-primary">.in</span> <span className="opacity-40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] hidden xs:inline">ATM Kiosk</span>
                </h1>
            </div>
            {kioskState === 'SCANNING' && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button 
                        variant="ghost" 
                        className={cn(
                            "font-black text-[10px] sm:text-[11px] rounded-full h-8 sm:h-10 px-2.5 sm:px-4 border shadow-sm flex items-center gap-1.5 transition-all",
                            savedSchoolCode 
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20" 
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse"
                        )} 
                        onClick={() => {
                            setTempSchoolCodeInput(savedSchoolCode);
                            setIsSchoolCodeModalOpen(true);
                        }}
                    >
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> 
                        <span>
                            {savedSchoolCode 
                                ? <span><span className="hidden sm:inline">Sekolah: </span><span className="uppercase font-extrabold">{savedSchoolCode}</span></span>
                                : <span><span className="hidden sm:inline">Filter </span>Kode Sekolah</span>
                            }
                        </span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="text-emerald-400 font-black text-[10px] sm:text-[11px] rounded-full h-8 sm:h-10 px-2.5 sm:px-4 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm flex items-center gap-1.5" 
                        onClick={() => setIsSettlementOpen(true)}
                    >
                        <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                        <span><span className="hidden sm:inline">Rekap Kas </span>Penjaga</span>
                    </Button>
                    {activeScanMode === 'CAMERA' && (
                        <Button variant="ghost" className="text-white/60 text-[10px] sm:text-[11px] font-bold rounded-full h-8 sm:h-10 px-2.5 sm:px-4 bg-white/10 border border-white/10" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}>
                            <RefreshCw className="h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Ganti Kamera</span>
                        </Button>
                    )}
                    <Button variant="ghost" className="text-white/60 text-[10px] sm:text-[11px] font-bold rounded-full h-8 sm:h-10 px-2.5 sm:px-4 bg-white/10 border border-white/10" asChild>
                        <Link href="/login"><ArrowLeft className="h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Keluar</span></Link>
                    </Button>
                </div>
            )}
        </div>

        {/* AREA KONTEN UTAMA */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
            
            {/* 1. STATE: SCANNING */}
            {kioskState === 'SCANNING' && (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 max-w-lg w-full space-y-4 sm:space-y-6">
                    
                    {/* Tab Switcher Mode Scan */}
                    <div className="flex items-center justify-center p-1 sm:p-1.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-sm w-full mx-auto shadow-xl">
                        <button
                            type="button"
                            onClick={() => handleModeChange('DEVICE')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300",
                                activeScanMode === 'DEVICE'
                                    ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-100"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Usb className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            <span className="truncate">Scanner Device</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleModeChange('CAMERA')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300",
                                activeScanMode === 'CAMERA'
                                    ? "bg-blue-600 text-white font-black shadow-[0_0_25px_rgba(37,99,235,0.4)] scale-100"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            <span className="truncate">Kamera Web / HP</span>
                        </button>
                    </div>

                    {/* TAMPILAN MODE 1: SCANNER HARDWARE / DEVICE (BLUETOOTH / USB) */}
                    {activeScanMode === 'DEVICE' && (
                        <div className="relative w-full bg-slate-900/80 border border-emerald-500/20 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col items-center text-center backdrop-blur-2xl shadow-2xl space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                            {/* Input Tersembunyi Khusus HP Android/iOS (inputMode="none" cegah Soft Keyboard) */}
                            <input
                                ref={deviceInputRef}
                                type="text"
                                inputMode="none"
                                value={deviceInputVal}
                                onChange={(e) => {
                                    setDeviceInputVal(e.target.value);
                                    setIsCashcowReading(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const code = deviceInputVal.trim();
                                        setDeviceInputVal('');
                                        if (code && !processingRef.current) {
                                            processingRef.current = true;
                                            setIsCashcowReading(true);
                                            handleScanResult(code);
                                        }
                                    }
                                }}
                                className="absolute opacity-0 pointer-events-none -z-10 w-1 h-1"
                                autoComplete="off"
                            />

                            <div className="relative my-2">
                                <div className="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                                    <Usb className="h-12 w-12 animate-pulse" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-2 rounded-full font-bold shadow-lg">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                    Scanner Physical / Bluetooth Siap
                                </div>
                                <h2 className="text-xl font-black text-white">Arahkan ke Scanner HC-P10</h2>
                                <p className="text-xs text-white/60 font-medium leading-relaxed max-w-xs mx-auto">
                                    Dekatkan kartu QR / Barcode siswa ke modul sensor. Tanpa lag beban kamera!
                                </p>
                            </div>

                            {/* Status Indikator Pembacaan */}
                            <div className={cn(
                                "w-full py-3.5 px-4 rounded-2xl border text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2.5",
                                isCashcowReading 
                                    ? "bg-blue-600/30 border-blue-400 text-blue-200 animate-pulse scale-102" 
                                    : "bg-white/5 border-white/10 text-white/70"
                            )}>
                                {isCashcowReading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                        <span>Membaca Kode Barcode / QR...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>Status: Standby (Sensitivitas Tinggi)</span>
                                    </>
                                )}
                            </div>

                            <div className="pt-2 text-left bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-[10px] text-white/50 space-y-1">
                                <p className="font-bold text-white/80">💡 Informasi Mode Device:</p>
                                <p>• Sangat cepat & hemat baterai/CPU laptop & HP.</p>
                                <p>• Jika memakai HP Android Bluetooth: Atur Layout Keyboard Fisik ke Default di HP jika belum muncul.</p>
                            </div>
                        </div>
                    )}

                    {/* TAMPILAN MODE 2: KAMERA WEB / HP */}
                    {activeScanMode === 'CAMERA' && (
                        <div className="flex flex-col items-center w-full space-y-4 sm:space-y-5 animate-in fade-in duration-300">
                            {/* Visual Frame Scanner Kamera - BENAR-BENAR TRANSPARAN TANPA BLUR DI TENGAH */}
                            <div className="relative w-64 h-64 sm:w-80 sm:h-80 border-2 border-blue-500/30 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-center overflow-hidden bg-transparent shadow-[0_0_50px_rgba(37,99,235,0.25)]">
                                {/* Siku Sudut Mengkilap */}
                                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-400 rounded-tl-2xl sm:rounded-tl-[2rem]" />
                                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-400 rounded-tr-2xl sm:rounded-tr-[2rem]" />
                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-400 rounded-bl-2xl sm:rounded-bl-[2rem]" />
                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-400 rounded-br-2xl sm:rounded-br-[2rem]" />
                                
                                {/* Garis Laser Pemindai Halus */}
                                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] animate-[bounce_2s_infinite]" />
                                
                                {/* Indikator Status Memuat Kamera (Hanya Tampil Jika Kamera Belum Aktif) */}
                                {!hasCameraPermission && (
                                  <div className="flex flex-col items-center gap-2 p-4 text-center bg-black/80 rounded-2xl border border-red-500/30 text-red-400">
                                    <AlertCircle className="h-8 w-8 animate-bounce" />
                                    <p className="text-xs font-bold">Mempersiapkan Kamera...</p>
                                  </div>
                                )}
                            </div>

                            {/* Teks Petunjuk Jelas Di Luar Bingkai Pindai */}
                            <div className="text-center bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-lg">
                                <p className="text-xs text-white font-bold flex items-center justify-center gap-2">
                                    <QrCode className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span>Arahkan QR kartu siswa tepat ke dalam kotak lensa</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Manual Code Input Button */}
                    <div className="pt-2 w-full text-center">
                        {!manualInputOpen ? (
                            <Button 
                                variant="ghost" 
                                className="text-white/50 text-[11px] font-bold h-9 px-4 rounded-full hover:text-white hover:bg-white/10 transition-colors"
                                onClick={() => setManualInputOpen(true)}
                            >
                                <Keyboard className="mr-2 h-3.5 w-3.5" /> Ketik NIS / Kode Sekolah Manual
                            </Button>
                        ) : (
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (manualNis.trim()) {
                                        const effectiveSchoolCode = manualSchoolCode.trim() || savedSchoolCode.trim();
                                        const finalCode = effectiveSchoolCode 
                                            ? `${manualNis.trim()},${effectiveSchoolCode}`
                                            : manualNis.trim();
                                        handleScanResult(finalCode);
                                        setManualNis('');
                                        setManualSchoolCode('');
                                        setManualInputOpen(false);
                                    }
                                }}
                                className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto p-3 bg-slate-900/90 border border-white/20 rounded-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-300 shadow-2xl"
                            >
                                <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                                    <input
                                        type="text"
                                        value={manualSchoolCode}
                                        onChange={(e) => setManualSchoolCode(e.target.value)}
                                        placeholder={savedSchoolCode ? `Sekolah: ${savedSchoolCode.toUpperCase()}` : "Kode Sekolah (Opsional)"}
                                        className="w-full sm:w-1/3 h-11 bg-white/10 border border-white/20 rounded-xl px-3 text-white text-xs font-bold focus:outline-none focus:border-primary placeholder:text-white/40 uppercase"
                                    />
                                    <input
                                        type="text"
                                        value={manualNis}
                                        onChange={(e) => setManualNis(e.target.value)}
                                        placeholder="NIS / NISN Siswa..."
                                        autoFocus
                                        className="w-full sm:w-2/3 h-11 bg-white/10 border border-white/20 rounded-xl px-3 text-white text-xs font-bold focus:outline-none focus:border-primary placeholder:text-white/40"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                                    <Button 
                                        type="submit" 
                                        disabled={!manualNis.trim()} 
                                        className="h-11 px-4 rounded-xl bg-primary text-white font-black text-xs uppercase shadow-md"
                                    >
                                        Cari
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => setManualInputOpen(false)}
                                        className="h-11 w-11 p-0 rounded-xl bg-white/5 text-white/50 hover:text-white"
                                    >
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </form>
                        )}
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
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Total Saldo Tabungan (Dana Bebas)</p>
                                <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(student.balance)}</p>
                                {student.dailyLimit && student.dailyLimit > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Sisa Uang Saku Kios Hari Ini:</span>
                                        <span className="font-extrabold text-amber-300">
                                            {formatCurrency(student.remainingDailyLimit ?? student.dailyLimit)}
                                        </span>
                                    </div>
                                )}
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
                        <p className="text-white/40 text-[11px] font-black tracking-[0.2em] uppercase">
                            {student.dailyLimit && student.dailyLimit > 0
                                ? `Sisa Jatah Tarik Hari Ini: ${formatCurrency(student.remainingDailyLimit ?? student.dailyLimit)}`
                                : `Maksimal: ${formatCurrency(student.balance)}`
                            }
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        {QUICK_AMOUNTS.map(amt => {
                            const maxAllowed = student.dailyLimit && student.dailyLimit > 0
                                ? Math.min(student.balance, student.remainingDailyLimit ?? student.dailyLimit)
                                : student.balance;
                            return (
                                <Button 
                                    key={amt}
                                    disabled={amt > maxAllowed}
                                    className="h-28 rounded-[2.5rem] bg-white/10 border border-white/20 text-white text-2xl font-black hover:bg-white shadow-2xl hover:text-primary transition-all active:scale-90 disabled:opacity-20"
                                    onClick={() => {
                                        setAmount(amt);
                                        setReason('Uang Saku / Jajan');
                                        setIsCustomReason(false);
                                        setKioskState('REASON_SELECTION');
                                    }}
                                >
                                    {amt.toLocaleString('id-ID')}
                                </Button>
                            );
                        })}
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
                            onClick={() => {
                                setReason('Uang Saku / Jajan');
                                setIsCustomReason(false);
                                setKioskState('REASON_SELECTION');
                            }}
                        >
                            LANJUTKAN
                        </Button>
                    </div>
                </div>
            )}

            {/* 5.5. STATE: REASON SELECTION */}
            {kioskState === 'REASON_SELECTION' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-6 animate-in slide-in-from-right-12 duration-500">
                    <div className="text-center w-full">
                        <h2 className="text-2xl font-black text-white tracking-tight mb-1 uppercase">Keperluan Penarikan</h2>
                        <p className="text-white/40 text-xs font-bold">Pilih atau ketik alasan penarikan dana</p>
                        
                        <div className="mt-4 bg-white/10 p-4 rounded-2xl border border-white/20 flex items-center justify-between px-6">
                            <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Jumlah Ditarik</span>
                            <span className="text-2xl font-black text-white">{formatCurrency(amount)}</span>
                        </div>
                    </div>

                    {/* Preset Chips */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {PRESET_REASONS.map((preset) => {
                            const isSelected = !isCustomReason && reason === preset.label;
                            const isLainnya = preset.label === 'Lainnya';
                            return (
                                <Button
                                    key={preset.label}
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "h-14 rounded-2xl border text-left justify-start px-4 transition-all flex items-center gap-3",
                                        (isSelected || (isLainnya && isCustomReason))
                                            ? "bg-primary border-primary text-white font-black shadow-lg shadow-primary/30 scale-[1.02]"
                                            : "bg-white/5 border-white/10 text-white/80 font-bold hover:bg-white/10 hover:text-white"
                                    )}
                                    onClick={() => {
                                        if (isLainnya) {
                                            setIsCustomReason(true);
                                            setReason('');
                                        } else {
                                            setIsCustomReason(false);
                                            setReason(preset.label);
                                        }
                                    }}
                                >
                                    <span className="text-xl">{preset.icon}</span>
                                    <span className="text-xs truncate">{preset.label}</span>
                                </Button>
                            );
                        })}
                    </div>

                    {/* Custom Input Field */}
                    <div className="w-full space-y-2">
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                            }}
                            placeholder="Ketik keterangan khusus di sini..."
                            className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl px-5 text-white font-bold placeholder:text-white/30 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    <div className="flex gap-4 w-full pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-16 rounded-[2rem] bg-white/5 border-white/10 text-white font-black text-base uppercase"
                            onClick={() => setKioskState('WITHDRAW_MENU')}
                        >
                            Kembali
                        </Button>
                        <Button
                            className="flex-1 h-16 rounded-[2rem] bg-primary text-white font-black text-base uppercase shadow-2xl hover:bg-primary/90"
                            disabled={!reason.trim()}
                            onClick={() => handleWithdraw(amount, reason.trim())}
                        >
                            PROSES TARIK
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
                                    <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                                        <span className="uppercase tracking-[0.2em] text-[10px] text-gray-400">Keterangan</span>
                                        <span className="text-gray-900 font-black truncate max-w-[180px] uppercase">{reason}</span>
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
        {/* Modal Rekap & Selisih Kas Penjaga Kios */}
        <KioskSettlementModal 
          isOpen={isSettlementOpen} 
          onClose={() => setIsSettlementOpen(false)} 
        />

        {/* Modal Filter Kode Sekolah Kiosk */}
        {isSchoolCodeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-md text-white p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Filter Kode Sekolah Kios</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Isolasi data & cegah bentrok NIS siswa</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSchoolCodeModalOpen(false)} className="rounded-full h-8 w-8 text-slate-400 hover:text-white">
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Atur Kode Sekolah di mana perangkat ATM Kios ini beroperasi. Setelah disimpan, semua pencarian & pemindaian NIS secara otomatis terfilter khusus untuk sekolah tersebut.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Kode Sekolah (Contoh: SCH001 / SMPN1)</label>
                  <input 
                    type="text" 
                    value={tempSchoolCodeInput} 
                    onChange={(e) => setTempSchoolCodeInput(e.target.value)} 
                    placeholder="Masukkan kode sekolah..." 
                    className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-blue-500 uppercase"
                    autoFocus
                  />
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-200">✨ Manfaat Utama Penguncian Kode Sekolah:</p>
                  <p>• Mencegah siswa dari sekolah lain tertukar jika NIS-nya sama.</p>
                  <p>• Siswa & penjaga tidak perlu mengetik kode sekolah berulang kali.</p>
                  <p>• Data transaksi & rekap laci kasir otomatis terisolasi aman.</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {savedSchoolCode && (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => handleSaveSchoolCode('')} 
                    className="border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold h-10 rounded-xl hover:bg-slate-700"
                  >
                    Hapus Filter
                  </Button>
                )}
                <Button 
                  type="button"
                  onClick={() => handleSaveSchoolCode(tempSchoolCodeInput)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black h-10 rounded-xl shadow-lg"
                >
                  Simpan & Lock Kode Sekolah
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
