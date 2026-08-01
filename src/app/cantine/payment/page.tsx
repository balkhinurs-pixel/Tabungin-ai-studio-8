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
  Loader2,
  Camera,
  QrCode,
  Usb,
  Keyboard,
  Printer,
  Coins,
  Wallet
} from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  getStudentDataForPayment, 
  processCantinePayment, 
  processCashPaymentAction, 
  getCanteenDailySummaryAction, 
  getCanteenItemsAction 
} from '../actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type PaymentState = 'POS_CATALOG' | 'AMOUNT_INPUT' | 'METHOD_SELECT' | 'SCANNING' | 'CASH_INPUT' | 'PIN_INPUT' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

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

  // Daily Summary Quick Info
  const [dailySummary, setDailySummary] = useState({ todayRevenue: 0, todayCount: 0, topItem: '-' });

  // Payment Method & Cash State
  const [payMethod, setPayMethod] = useState<'TABUNGAN' | 'TUNAI'>('TABUNGAN');
  const [cashGiven, setCashGiven] = useState('');
  const [cashChange, setCashChange] = useState(0);
  const [customerName, setCustomerName] = useState('');

  // Payment State
  const [student, setStudent] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  // Scan Method: Hardware Scanner / USB Barcode vs Camera
  const [scanMethod, setScanMethod] = useState<'DEVICE' | 'CAMERA'>('DEVICE');
  const [manualScanInput, setManualScanInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Load Menu Items & Daily Summary on Mount
  const loadData = async () => {
    setLoadingItems(true);
    const [itemsData, summaryData] = await Promise.all([
      getCanteenItemsAction(),
      getCanteenDailySummaryAction()
    ]);
    setCanteenItems(itemsData || []);
    if (summaryData) setDailySummary(summaryData);
    setLoadingItems(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto Focus Hardware Scanner Input
  useEffect(() => {
    if (state === 'SCANNING' && scanMethod === 'DEVICE') {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state, scanMethod]);

  const handleReset = () => {
    setState('POS_CATALOG');
    setStudent(null);
    setAmount('');
    setPin('');
    setCart([]);
    setIsProcessingQR(false);
    setErrorMessage('');
    setManualScanInput('');
    setCashGiven('');
    setCashChange(0);
    setCustomerName('');
    loadData();
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
    if (state !== 'SCANNING' || scanMethod !== 'CAMERA') return;

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
      if (state === 'SCANNING' && scanMethod === 'CAMERA' && !isProcessingQR && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
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
      if (state === 'SCANNING' && scanMethod === 'CAMERA') requestAnimationFrame(tick);
    };

    const animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [state, scanMethod, isProcessingQR, toast]);

  const handleScan = async (data: string) => {
    if (!data.trim()) return;
    setIsProcessingQR(true);
    
    const result = await getStudentDataForPayment(data);

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
        setPayMethod('TABUNGAN');
        setState('SUCCESS');
    } else {
        setErrorMessage(result.message);
        setState('ERROR');
    }
  };

  // Process Cash Payment
  const handleProcessCashPayment = async () => {
    const cashVal = parseInt(cashGiven || '0');
    if (cashVal < finalAmount) {
      toast({ title: "Uang tunai tidak cukup!", variant: "destructive" });
      return;
    }

    setState('PROCESSING');
    const result = await processCashPaymentAction({
      amount: finalAmount,
      cashGiven: cashVal,
      customerName: customerName || 'Pembeli Tunai',
      items: posMode === 'CATALOG' ? cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })) : undefined
    });

    if (result.success) {
      setPayMethod('TUNAI');
      setCashChange(result.change || 0);
      setState('SUCCESS');
    } else {
      setErrorMessage(result.message);
      setState('ERROR');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
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
                    onClick={() => setState('METHOD_SELECT')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black h-12 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    <ScanLine className="h-4 w-4" /> Lanjut ke Pembayaran
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1.5: METHOD SELECTION (Tabungan vs Tunai) */}
          {state === 'METHOD_SELECT' && (
            <div className="flex flex-col items-center w-full max-w-md space-y-5 flex-1 justify-center my-auto">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">METODE PEMBAYARAN</span>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Pilih Pembayaran</h2>
                <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full inline-block border border-emerald-200">
                  Total Tagihan: Rp {finalAmount.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                {/* OPSI 1: TABUNGAN SISWA */}
                <button
                  type="button"
                  onClick={() => {
                    setPayMethod('TABUNGAN');
                    setState('SCANNING');
                  }}
                  className="p-4 rounded-3xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-gray-900">Tabungan Siswa (NFC / QR / NIS)</h3>
                      <p className="text-[11px] text-gray-500 font-medium">Potong saldo tabungan siswa via PIN</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                </button>

                {/* OPSI 2: PEMBAYARAN TUNAI (CASH) */}
                <button
                  type="button"
                  onClick={() => {
                    setPayMethod('TUNAI');
                    setCashGiven(finalAmount.toString());
                    setState('CASH_INPUT');
                  }}
                  className="p-4 rounded-3xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 transition-all text-left flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <Banknote className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-gray-900">Pembayaran Tunai (Cash)</h3>
                      <p className="text-[11px] text-gray-500 font-medium">Terima tunai & kalkulasi kembalian</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <Button variant="ghost" className="text-gray-400 font-bold text-xs" onClick={() => setState('POS_CATALOG')}>
                Kembali ke Keranjang
              </Button>
            </div>
          )}

          {/* STEP 2A: CASH INPUT MODE */}
          {state === 'CASH_INPUT' && (
            <div className="flex flex-col items-center w-full max-w-md space-y-4 flex-1 justify-center my-auto">
              <Card className="w-full border-2 border-emerald-200 bg-white rounded-3xl shadow-md p-5 space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    <Banknote className="h-3.5 w-3.5" /> Pembayaran Tunai
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Hitung Uang & Kembalian</h3>
                </div>

                {/* Ringkasan Nominal */}
                <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400">Total Tagihan:</span>
                    <span className="text-gray-900 font-black text-sm">Rp {finalAmount.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-gray-200">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Uang Tunai Diterima (Rp)</label>
                    <Input 
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder="Masukkan nominal uang..."
                      className="h-12 text-lg font-black rounded-xl border-emerald-200 text-emerald-700 bg-white"
                      autoFocus
                    />
                  </div>

                  {/* Tombol Cepat Nominal Uang */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setCashGiven(finalAmount.toString())}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black hover:bg-emerald-200"
                    >
                      Uang Pas (Rp {finalAmount.toLocaleString('id-ID')})
                    </button>
                    {[10000, 20000, 50000, 100000].map(val => (
                      val >= finalAmount && (
                        <button 
                          key={val}
                          type="button" 
                          onClick={() => setCashGiven(val.toString())}
                          className="px-2.5 py-1 rounded-lg bg-gray-200 text-gray-700 text-[10px] font-black hover:bg-gray-300"
                        >
                          Rp {val.toLocaleString('id-ID')}
                        </button>
                      )
                    ))}
                  </div>

                  {/* Live Kalkulasi Kembalian */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-xs font-black text-gray-600">UANG KEMBALIAN:</span>
                    <span className={cn(
                      "text-xl font-black",
                      (parseInt(cashGiven || '0') - finalAmount) >= 0 ? "text-emerald-600" : "text-rose-500"
                    )}>
                      Rp {Math.max(0, parseInt(cashGiven || '0') - finalAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">Catatan Nama Pembeli (Opsional)</label>
                  <Input 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Bpk Guru / Siswa Tunai"
                    className="h-9 rounded-xl text-xs font-bold"
                  />
                </div>

                <Button 
                  disabled={parseInt(cashGiven || '0') < finalAmount}
                  onClick={handleProcessCashPayment}
                  className="w-full h-12 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg text-xs tracking-wider"
                >
                  PROSES PEMBAYARAN TUNAI
                </Button>
              </Card>

              <Button variant="ghost" className="text-rose-500 font-bold text-xs" onClick={() => setState('METHOD_SELECT')}>
                Batal & Pilih Metode Lain
              </Button>
            </div>
          )}

          {/* STEP 1 (MANUAL): INPUT NOMINAL MANUAL */}
          {state === 'POS_CATALOG' && posMode === 'MANUAL' && (
              <Keypad label="Masukan Nominal Belanja" value={amount} onChange={setAmount} onConfirm={() => setState('SCANNING')} />
          )}

          {/* STEP 2: SCANNING */}
          {state === 'SCANNING' && (
              <div className="flex flex-col items-center w-full max-w-md space-y-5 flex-1 justify-center">
                  {/* Total Tagihan Banner */}
                  <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-2xl flex items-center gap-2 font-black text-xs">
                      <Banknote className="h-4 w-4" />
                      <span>Total Tagihan: Rp {finalAmount.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Mode Selector: DEVICE SCANNER vs KAMERA */}
                  <div className="flex items-center gap-1 bg-gray-200/80 p-1.5 rounded-2xl w-full">
                      <button
                          type="button"
                          onClick={() => setScanMethod('DEVICE')}
                          className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all",
                              scanMethod === 'DEVICE' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                          )}
                      >
                          <Usb className="h-4 w-4 text-emerald-600" />
                          <span>Alat Scanner / USB</span>
                      </button>
                      <button
                          type="button"
                          onClick={() => setScanMethod('CAMERA')}
                          className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all",
                              scanMethod === 'CAMERA' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                          )}
                      >
                          <Camera className="h-4 w-4 text-primary" />
                          <span>Kamera HP / Webcam</span>
                      </button>
                  </div>

                  {scanMethod === 'DEVICE' ? (
                      /* HARDWARE SCANNER / MANUAL NIS MODE */
                      <Card className="w-full border-2 border-emerald-100 bg-white rounded-3xl shadow-md overflow-hidden p-5">
                          <div className="space-y-4 text-center">
                              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-emerald-200">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                  HARDWARE SCANNER SIAP
                              </div>

                              <div className="space-y-1">
                                  <h3 className="text-base font-black text-gray-900">Scan Kartu dengan Alat Scanner</h3>
                                  <p className="text-xs text-gray-400 font-bold">
                                      Arahkan alat barcode scanner USB / Bluetooth ke kartu siswa, atau ketik NIS di bawah ini:
                                  </p>
                              </div>

                              <form 
                                  onSubmit={(e) => {
                                      e.preventDefault();
                                      handleScan(manualScanInput);
                                  }}
                                  className="space-y-3 pt-2"
                              >
                                  <div className="relative">
                                      <QrCode className="absolute left-3.5 top-3.5 h-5 w-5 text-emerald-600" />
                                      <Input 
                                          ref={scannerInputRef}
                                          value={manualScanInput}
                                          onChange={(e) => setManualScanInput(e.target.value)}
                                          placeholder="Arahkan scanner / ketik NIS..."
                                          className="pl-11 pr-4 h-12 rounded-2xl border-2 border-emerald-200 text-sm font-black focus-visible:ring-emerald-500 bg-emerald-50/20"
                                          autoFocus
                                      />
                                  </div>

                                  <Button 
                                      type="submit" 
                                      disabled={!manualScanInput.trim() || isProcessingQR} 
                                      className="w-full h-12 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                  >
                                      {isProcessingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Proses & Cari Siswa'}
                                  </Button>
                              </form>

                              <p className="text-[10px] font-bold text-gray-400 italic">
                                  *Scanner USB / Bluetooth otomatis menekan Enter setelah scan.
                              </p>
                          </div>
                      </Card>
                  ) : (
                      /* CAMERA SCANNER MODE */
                      <div className="flex flex-col items-center space-y-3">
                          <div className="relative w-64 h-64 border-4 border-dashed border-gray-200 rounded-[2.5rem] overflow-hidden flex items-center justify-center bg-gray-100">
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                              <canvas ref={canvasRef} className="hidden" />
                              <div className="absolute inset-0 border-[20px] border-white/40 pointer-events-none" />
                              <div className="absolute w-full h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse" />
                          </div>
                          
                          <div className="text-center">
                              <h3 className="text-sm font-black text-gray-900 tracking-tight">Kamera Utama Aktif</h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Arahkan kamera ke kode QR kartu siswa.</p>
                          </div>
                      </div>
                  )}

                  <Button variant="ghost" className="text-rose-500 font-bold text-xs h-8" onClick={handleReset}>
                      Batalkan Transaksi
                  </Button>
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
              <div className="w-full max-w-sm text-center space-y-4 py-2 my-auto">
                  <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  
                  <div className="space-y-0.5">
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">PEMBAYARAN BERHASIL</h2>
                      <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Transaksi & Stok Telah Terpotong</p>
                  </div>

                  {/* Struk Thermal POS Card */}
                  <Card id="thermal-receipt" className="bg-white border-2 border-dashed border-gray-200 rounded-2xl shadow-sm text-left">
                      <CardContent className="p-4 space-y-3 font-mono text-xs">
                          {/* Header Struk */}
                          <div className="text-center border-b border-dashed border-gray-200 pb-2">
                              <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">STRUK BELANJA KANTIN</h3>
                              <p className="text-[10px] text-gray-500 font-sans">Sistem Tabung.in POS</p>
                              <p className="text-[9px] text-gray-400 mt-0.5">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
                          </div>

                          {/* Info Pembeli & Metode */}
                          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-200 pb-2">
                              <div className="flex justify-between">
                                  <span className="text-gray-500">Metode:</span>
                                  <span className="font-bold text-gray-900">{payMethod === 'TABUNGAN' ? 'TABUNGAN SISWA' : 'CASH / TUNAI'}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-gray-500">Pelanggan:</span>
                                  <span className="font-bold text-gray-900">{payMethod === 'TABUNGAN' ? student?.name : (customerName || 'Pembeli Tunai')}</span>
                              </div>
                              {payMethod === 'TABUNGAN' && student?.nis && (
                                  <div className="flex justify-between">
                                      <span className="text-gray-500">NIS:</span>
                                      <span className="font-bold text-gray-900">{student.nis}</span>
                                  </div>
                              )}
                          </div>

                          {/* Rincian Item Barang */}
                          {cart.length > 0 ? (
                            <div className="space-y-1.5 border-b border-dashed border-gray-200 pb-2">
                              <div className="flex justify-between font-bold text-[10px] text-gray-400 uppercase">
                                <span>Item</span>
                                <span>Subtotal</span>
                              </div>
                              {cart.map(c => (
                                <div key={c.id} className="flex justify-between text-[11px] font-bold">
                                  <span>{c.name} ({c.qty}x)</span>
                                  <span>Rp {(c.price * c.qty).toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex justify-between text-[11px] font-bold border-b border-dashed border-gray-200 pb-2">
                              <span>Pembelian Kantin</span>
                              <span>Rp {finalAmount.toLocaleString('id-ID')}</span>
                            </div>
                          )}

                          {/* Total & Kembalian */}
                          <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-sm font-black">
                                  <span>TOTAL:</span>
                                  <span className="text-emerald-600">Rp {finalAmount.toLocaleString('id-ID')}</span>
                              </div>
                              {payMethod === 'TUNAI' && (
                                <>
                                  <div className="flex justify-between text-[11px] text-gray-600">
                                      <span>Tunai Diterima:</span>
                                      <span>Rp {parseInt(cashGiven || '0').toLocaleString('id-ID')}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold text-emerald-700">
                                      <span>Kembalian:</span>
                                      <span>Rp {cashChange.toLocaleString('id-ID')}</span>
                                  </div>
                                </>
                              )}
                          </div>

                          <div className="text-center pt-2 text-[9px] text-gray-400 font-sans border-t border-dashed border-gray-200">
                              Terima Kasih Atas Kunjungan Anda!
                          </div>
                      </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                      <Button 
                        onClick={handlePrintReceipt}
                        className="w-full h-11 rounded-xl font-black bg-gray-900 hover:bg-gray-800 text-white shadow-md flex items-center justify-center gap-2 text-xs"
                      >
                        <Printer className="h-4 w-4 text-emerald-400" /> CETAK STRUK THERMAL
                      </Button>

                      <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-gray-600 text-xs" onClick={handleReset}>
                              TRANSAKSI BARU
                          </Button>
                          <Button className="flex-1 h-11 rounded-xl font-black shadow-md text-xs bg-primary" onClick={() => router.push('/cantine/outlet')}>
                              SELESAI
                          </Button>
                      </div>
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

