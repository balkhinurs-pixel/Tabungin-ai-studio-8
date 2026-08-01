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
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  Calculator,
  Search,
  Loader2
} from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getStudentDataForPayment, processCantinePayment, getCanteenItemsAction } from '../actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type PaymentState = 'POS_CATALOG' | 'AMOUNT_INPUT' | 'SCANNING' | 'PIN_INPUT' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  maxStock: number;
  category: string;
}

export default function CantinePOSPage() {
  const [state, setState] = useState<PaymentState>('POS_CATALOG');
  const [posMode, setPosMode] = useState<'CATALOG' | 'MANUAL'>('CATALOG');
  
  // Catalog State
  const [canteenItems, setCanteenItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Payment State
  const [student, setStudent] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Load Menu Items on Mount
  useEffect(() => {
    async function fetchMenu() {
      setLoadingItems(true);
      const data = await getCanteenItemsAction();
      setCanteenItems(data || []);
      setLoadingItems(false);
    }
    fetchMenu();
  }, []);

  const handleReset = () => {
    setState('POS_CATALOG');
    setStudent(null);
    setAmount('');
    setPin('');
    setCart([]);
    setIsProcessingQR(false);
    setErrorMessage('');
  };

  // Total amount calculated from cart or manual input
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const finalAmount = posMode === 'CATALOG' ? cartTotal : parseInt(amount || '0');

  // Cart operations
  const addToCart = (item: any) => {
    if (item.stock <= 0) {
      toast({ title: 'Stok Habis!', variant: 'destructive' });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty >= item.stock) {
          toast({ title: `Maksimal stok tercapai (${item.stock})`, variant: 'destructive' });
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        maxStock: item.stock,
        category: item.category || 'Makanan'
      }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        if (newQty > i.maxStock) {
          toast({ title: `Stok maksimal: ${i.maxStock}`, variant: 'destructive' });
          return i;
        }
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean) as CartItem[]);
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
        amount: finalAmount,
        pin: pin,
        items: posMode === 'CATALOG' ? cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })) : undefined
    });

    if (result.success) {
        setState('SUCCESS');
        setTimeout(() => router.push('/cantine/outlet'), 5000);
    } else {
        setErrorMessage(result.message);
        setState('ERROR');
    }
  };

  // Filter Catalog Items
  const filteredCatalogItems = canteenItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
    return matchSearch && matchCat;
  });

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
    <div className="fixed inset-0 bg-gray-50 flex flex-col p-4 overflow-hidden z-[60]">
      {/* Header POS */}
      <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-full bg-gray-100 h-9 w-9" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Mode Switcher: KATALOG POS vs NOMINAL MANUAL */}
          {state === 'POS_CATALOG' && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPosMode('CATALOG')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                  posMode === 'CATALOG' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" /> Menu POS
              </button>
              <button
                type="button"
                onClick={() => setPosMode('MANUAL')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                  posMode === 'MANUAL' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <Calculator className="h-3.5 w-3.5" /> Ketik Nominal
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                <Banknote className="h-4 w-4" />
            </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {/* STEP 1: MODE POS KATALOG BARANG */}
          {state === 'POS_CATALOG' && posMode === 'CATALOG' && (
            <div className="w-full flex-1 flex flex-col lg:flex-row overflow-hidden max-w-lg lg:max-w-5xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm p-4 gap-4">
              {/* Left Column: Filter & Menu Grid */}
              <div className="flex-1 flex flex-col min-w-0 space-y-3 overflow-hidden">
                {/* Filter & Search Header */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Cari makanan / minuman..."
                      className="pl-9 h-9 rounded-xl border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {['ALL', 'Makanan', 'Minuman', 'Snack', 'Paket', 'Lainnya'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[11px] font-black whitespace-nowrap transition-all",
                          activeCategory === cat ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {cat === 'ALL' ? 'Semua' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid Catalog Items */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {loadingItems ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredCatalogItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredCatalogItems.map(item => {
                        const cartEntry = cart.find(c => c.id === item.id);
                        return (
                          <div 
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className={cn(
                              "relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-28 active:scale-95 hover:border-primary/50",
                              cartEntry ? "border-primary bg-primary/5 shadow-sm" : "border-gray-100 bg-gray-50/50 hover:bg-gray-50",
                              item.stock <= 0 && "opacity-50 pointer-events-none"
                            )}
                          >
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Stok: {item.stock}
                              </span>
                              <h4 className="font-black text-xs text-gray-900 truncate leading-tight mt-0.5">{item.name}</h4>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <span className="font-black text-xs text-primary">Rp {item.price.toLocaleString('id-ID')}</span>
                              {cartEntry ? (
                                <div className="flex items-center gap-1 bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                                  {cartEntry.qty}x
                                </div>
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary">
                                  <Plus className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400">
                      <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Belum ada menu di kategori ini</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Cart Summary Bar & Checkout Panel */}
              <div className="lg:w-80 w-full shrink-0 flex flex-col justify-between bg-gray-900 text-white rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-white">Keranjang POS</h3>
                  </div>
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} className="text-[10px] font-bold text-rose-400 hover:underline">
                      Bersihkan
                    </button>
                  )}
                </div>

                <div className="flex-1 max-h-48 lg:max-h-80 overflow-y-auto space-y-2 divide-y divide-white/10 pr-1">
                  {cart.length > 0 ? (
                    cart.map(c => (
                      <div key={c.id} className="pt-2 flex items-center justify-between text-xs font-bold">
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-white">{c.name}</p>
                          <p className="text-[10px] text-white/50 font-normal">Rp {c.price.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateCartQty(c.id, -1)} className="p-1 rounded bg-white/10 hover:bg-white/20">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center">{c.qty}</span>
                          <button onClick={() => updateCartQty(c.id, 1)} className="p-1 rounded bg-white/10 hover:bg-white/20">
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="font-black text-emerald-400 min-w-[55px] text-right">
                            {(c.price * c.qty).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-white/40">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-1 opacity-30" />
                      <p className="text-xs font-bold">Keranjang Kosong</p>
                      <p className="text-[10px]">Klik menu di sebelah kiri untuk memilih pesanan</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-white/50 font-black uppercase tracking-wider">Total Pembayaran</p>
                      <p className="text-2xl font-black text-emerald-400">Rp {cartTotal.toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-xs font-bold text-white/60">{cart.reduce((a, c) => a + c.qty, 0)} Items</span>
                  </div>

                  <Button 
                    disabled={cart.length === 0}
                    onClick={() => setState('SCANNING')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black h-12 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    <ScanLine className="h-4 w-4" /> Scan & Bayar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 (MANUAL): INPUT NOMINAL MANUAL */}
          {state === 'POS_CATALOG' && posMode === 'MANUAL' && (
              <Keypad label="Masukan Nominal Belanja" value={amount} onChange={setAmount} onConfirm={() => setState('SCANNING')} />
          )}

          {/* STEP 2: SCANNING */}
          {state === 'SCANNING' && (
              <div className="flex flex-col items-center w-full max-w-sm space-y-6 flex-1 justify-center">
                  <div className="relative w-64 h-64 border-4 border-dashed border-gray-200 rounded-[2.5rem] overflow-hidden flex items-center justify-center bg-gray-100">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-[20px] border-white/40 pointer-events-none" />
                      <div className="absolute w-full h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse" />
                      
                      <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-lg shadow-lg flex items-center gap-2">
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="font-black text-xs">Rp {finalAmount.toLocaleString('id-ID')}</span>
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
                      <div className="h-16 w-16 border-4 border-gray-200 rounded-full" />
                      <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                  </div>
                  <div className="text-center">
                      <h2 className="text-lg font-black text-gray-900 tracking-widest uppercase">MEMPROSES...</h2>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest animate-pulse mt-1">Verifikasi Saldo & Potong Stok</p>
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
                      <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Transaksi & Stok Telah Terpotong</p>
                  </div>

                  <Card className="bg-white border border-gray-200 rounded-3xl shadow-sm">
                      <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Total Belanja</span>
                              <span className="text-lg font-black text-emerald-600">Rp {finalAmount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex flex-col items-start border-b border-gray-100 pb-2">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Nama Siswa</span>
                              <span className="font-bold text-gray-900 uppercase text-sm truncate w-full text-left">{student?.name}</span>
                          </div>
                          
                          {cart.length > 0 && (
                            <div className="border-b border-gray-100 pb-2 text-left space-y-1">
                              <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Rincian Belanja</span>
                              {cart.map(c => (
                                <div key={c.id} className="flex justify-between text-xs font-bold text-gray-700">
                                  <span>{c.name} x{c.qty}</span>
                                  <span>Rp {(c.price * c.qty).toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          )}

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

