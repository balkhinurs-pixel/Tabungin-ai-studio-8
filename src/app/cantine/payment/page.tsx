'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ScanLine, 
  ArrowLeft, 
  CheckCircle2, 
  Delete,
  ArrowRight,
  XCircle,
  Banknote,
  Clock
} from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStudentDataForPayment, processCantinePayment } from '../actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type PaymentState = 'AMOUNT_INPUT' | 'SCANNING' | 'PIN_INPUT' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export default function CantinePOSPage() {
  const [state, setState] = useState<PaymentState>('AMOUNT_INPUT');
  const [student, setStudent] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleReset = () => {
    setState('AMOUNT_INPUT');
    setStudent(null);
    setAmount('');
    setPin('');
    setIsProcessingQR(false);
    setErrorMessage('');
  };

  useEffect(() => {
    if (state !== 'SCANNING') return;

    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast({ title: "Izin Kamera Ditolak", variant: "destructive" });
      }
    };

    startCamera();

    const tick = () => {
      if (state === 'SCANNING' && !isProcessingQR && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData!.data, imageData!.width, imageData!.height);

        if (code) {
            setIsProcessingQR(true);
            handleScan(code.data);
        }
      }
      if (state === 'SCANNING') requestAnimationFrame(tick);
    };

    const animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [state, isProcessingQR, toast]);

  const handleScan = async (data: string) => {
    if (!data.includes(',')) {
        toast({ title: "Format QR Tidak Valid", variant: "destructive" });
        setTimeout(() => setIsProcessingQR(false), 2000);
        return;
    }

    const [nis, schoolCode] = data.split(',');
    const result = await getStudentDataForPayment(nis, schoolCode);

    if (result.success) {
        setStudent(result.data);
        setState('PIN_INPUT');
    } else {
        toast({ title: result.message, variant: "destructive" });
        setTimeout(() => setIsProcessingQR(false), 2000);
    }
  };

  const handleProcessPayment = async () => {
    setState('PROCESSING');
    const result = await processCantinePayment({
        studentId: student.id,
        nis: student.nis,
        schoolCode: student.schoolCode,
        amount: parseInt(amount),
        pin: pin
    });

    if (result.success) {
        setState('SUCCESS');
        setTimeout(() => router.push('/cantine/outlet'), 5000);
    } else {
        setErrorMessage(result.message);
        setState('ERROR');
    }
  };

  // Modern Compact Keypad for Mobile POS
  const Keypad = ({ value, onChange, onConfirm, label, subLabel, max = 9 }: any) => (
    <div className="w-full max-w-sm flex flex-col flex-1 justify-between py-2">
        <div className="text-center">
            <h2 className="text-[10px] font-black text-gray-400 tracking-[0.4em] uppercase mb-1">{label}</h2>
            <div className="bg-gray-50 p-3 rounded-2xl border-2 border-gray-100 shadow-sm transition-colors">
                <div className={cn(
                    "flex justify-center items-center h-12",
                    state === 'PIN_INPUT' ? "gap-3" : ""
                )}>
                  {state === 'PIN_INPUT' ? (
                    [...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-4 h-4 rounded-full transition-all duration-100",
                          i < value.length ? "bg-gray-900 scale-110" : "bg-gray-200"
                        )} 
                      />
                    ))
                  ) : (
                    <p className="text-3xl font-black text-primary truncate tracking-tighter">
                      Rp {parseInt(value || '0').toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
                {subLabel && <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">{subLabel}</p>}
            </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 px-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((k) => (
                <Button 
                    key={k} 
                    variant="outline" 
                    className={cn(
                        "h-14 text-xl font-black rounded-xl border border-gray-100 bg-white transition-all active:scale-95 active:bg-gray-50 shadow-sm",
                        k === 'C' && "text-rose-500 border-rose-50",
                        k === 'DEL' && "text-gray-400"
                    )}
                    onClick={() => {
                        if (k === 'C') onChange('');
                        else if (k === 'DEL') onChange(value.slice(0, -1));
                        else if (value.length < max) onChange(value + k.toString());
                    }}
                >
                    {k === 'DEL' ? <Delete className="h-5 w-5" /> : k}
                </Button>
            ))}
        </div>
        
        <div className="px-2">
          <Button 
              className="w-full h-14 rounded-xl text-base font-black shadow-xl shadow-primary/20 border-b-4 border-black/10 active:border-b-0 active:translate-y-1 transition-all" 
              disabled={!value || (state === 'PIN_INPUT' && value.length < 6)}
              onClick={onConfirm}
          >
              {state === 'PIN_INPUT' ? 'BAYAR SEKARANG' : 'LANJUT SCAN KARTU'} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white flex flex-col p-4 overflow-hidden z-[60]">
      {/* Header POS */}
      <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="rounded-full bg-gray-50 h-10 w-10" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Terminal Kasir</span>
              <span className="text-xs font-black text-gray-900 tracking-tight">
                  {state === 'AMOUNT_INPUT' && 'Nominal Belanja'}
                  {state === 'SCANNING' && 'Pindai Kartu'}
                  {state === 'PIN_INPUT' && 'Verifikasi Keamanan'}
                  {state === 'PROCESSING' && 'Sedang Memproses'}
                  {state === 'SUCCESS' && 'Pembayaran Berhasil'}
              </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
              <Banknote className="h-5 w-5" />
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {/* STEP 1: INPUT NOMINAL */}
          {state === 'AMOUNT_INPUT' && (
              <Keypad label="Masukan Jumlah" value={amount} onChange={setAmount} onConfirm={() => setState('SCANNING')} />
          )}

          {/* STEP 2: SCANNING */}
          {state === 'SCANNING' && (
              <div className="flex flex-col items-center w-full max-w-sm space-y-6 flex-1 justify-center">
                  <div className="relative w-64 h-64 border-4 border-dashed border-gray-100 rounded-[2.5rem] overflow-hidden flex items-center justify-center bg-gray-50">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-[20px] border-white/40 pointer-events-none" />
                      <div className="absolute w-full h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse" />
                      
                      <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-lg shadow-lg flex items-center gap-2">
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="font-black text-xs">Rp {parseInt(amount).toLocaleString('id-ID')}</span>
                      </div>
                  </div>
                  
                  <div className="text-center">
                      <h2 className="text-lg font-black text-gray-900 tracking-tight mb-1">SCAN KARTU SISWA</h2>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[180px] mx-auto leading-relaxed">Dekatkan kode QR pada kartu siswa ke kamera.</p>
                      <Button variant="ghost" className="mt-4 text-rose-500 font-bold text-xs h-8" onClick={handleReset}>Batal</Button>
                  </div>
              </div>
          )}

          {/* STEP 3: INPUT PIN */}
          {state === 'PIN_INPUT' && (
              <Keypad 
                label="PIN KEAMANAN SISWA" 
                subLabel={student?.name}
                value={pin} 
                onChange={setPin} 
                onConfirm={handleProcessPayment} 
                max={6}
              />
          )}

          {/* STEP 4: PROCESSING */}
          {state === 'PROCESSING' && (
              <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                      <div className="h-16 w-16 border-4 border-gray-100 rounded-full" />
                      <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                  </div>
                  <div className="text-center">
                      <h2 className="text-lg font-black text-gray-900 tracking-widest uppercase">MEMPROSES...</h2>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest animate-pulse mt-1">Verifikasi Saldo Aman</p>
                  </div>
              </div>
          )}

          {/* STEP 5: SUCCESS RECEIPT */}
          {state === 'SUCCESS' && (
              <div className="w-full max-w-sm text-center space-y-4 py-2">
                  <div className="h-20 w-20 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  
                  <div className="space-y-0.5">
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">PEMBAYARAN BERHASIL</h2>
                      <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Transaksi Telah Tercatat</p>
                  </div>

                  <Card className="bg-gray-50 border-2 border-white rounded-3xl shadow-sm">
                      <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Total Belanja</span>
                              <span className="text-lg font-black text-gray-900">Rp {parseInt(amount).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex flex-col items-start border-b border-gray-200 pb-2">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Nama Siswa</span>
                              <span className="font-bold text-gray-900 uppercase text-sm truncate w-full text-left">{student?.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Waktu</span>
                              <div className="flex items-center gap-1.5 text-gray-600 font-bold text-[10px]">
                                  <Clock className="h-3 w-3" /> {format(new Date(), 'HH:mm:ss')}
                              </div>
                          </div>
                      </CardContent>
                  </Card>

                  <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-12 rounded-xl font-black text-gray-500 text-[10px]" onClick={handleReset}>
                          TRANSAKSI BARU
                      </Button>
                      <Button className="flex-[1.5] h-12 rounded-xl font-black shadow-lg text-xs" onClick={() => router.push('/cantine/outlet')}>
                          SELESAI
                      </Button>
                  </div>
              </div>
          )}

          {/* STEP 6: ERROR */}
          {state === 'ERROR' && (
              <div className="w-full max-w-sm text-center space-y-4">
                   <div className="h-16 w-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-50">
                      <XCircle className="h-8 w-8 text-rose-600" />
                  </div>
                  <div className="space-y-1">
                      <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">GAGAL</h2>
                      <p className="text-rose-600 text-[10px] font-bold px-4 leading-relaxed">{errorMessage}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2">
                      <Button size="lg" className="w-full rounded-xl h-14 font-black shadow-lg" variant="destructive" onClick={() => setState('PIN_INPUT')}>
                          ULANGI PIN
                      </Button>
                      <Button variant="ghost" className="h-10 font-bold text-gray-400 text-[10px]" onClick={handleReset}>
                          Batalkan Transaksi
                      </Button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
