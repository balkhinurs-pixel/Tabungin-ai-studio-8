'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Receipt, 
  MessageCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Store,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { JastipItem, JastipOrder } from '@/types';
import { 
  getStudentJastipCatalogAction, 
  createStudentJastipOrderAction, 
  getStudentJastipOrdersAction 
} from '@/app/(main)/jastip/actions';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function StudentJastipShopPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JastipItem[]>([]);
  const [orders, setOrders] = useState<JastipOrder[]>([]);
  const [studentInfo, setStudentInfo] = useState<{
    id: string;
    name: string;
    class: string;
    nis: string;
    balance: number;
    daily_limit: number | null;
    today_spending: number;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Cart State
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'SALDO' | 'WHATSAPP'>('SALDO');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Success Dialog State
  const [successOrder, setSuccessOrder] = useState<{
    orderId: string;
    waLink: string;
    totalAmount: number;
  } | null>(null);

  const loadCatalogAndOrders = async () => {
    setLoading(true);
    try {
      const [catalogRes, ordersRes] = await Promise.all([
        getStudentJastipCatalogAction(),
        getStudentJastipOrdersAction()
      ]);
      setItems(catalogRes.items);
      setStudentInfo(catalogRes.student);
      setOrders(ordersRes);
    } catch (err) {
      console.error('Failed to load student jastip', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogAndOrders();
  }, []);

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category || 'Kebutuhan Santri')))];

  // Cart operations
  const handleAddToCart = (item: JastipItem) => {
    if (!item.is_available) return;
    setCart(prev => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 }
        };
      }
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        }
      };
    });
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: existing.quantity - 1 }
      };
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const cartItemsList = Object.values(cart);
  const totalCartCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cartItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItemsList.length === 0) {
      toast({ title: 'Keranjang Kosong', description: 'Pilih produk jastip terlebih dahulu.', variant: 'destructive' });
      return;
    }

    if (paymentMethod === 'SALDO' && studentInfo) {
      if (studentInfo.balance < totalCartPrice) {
        toast({
          title: 'Saldo Tabungan Kurang',
          description: `Saldo Anda ${formatRupiah(studentInfo.balance)}, total belanja ${formatRupiah(totalCartPrice)}. Anda dapat memilih metode Bayar via WA.`,
          variant: 'destructive'
        });
        return;
      }

      if (studentInfo.daily_limit && studentInfo.daily_limit > 0) {
        if (studentInfo.today_spending + totalCartPrice > studentInfo.daily_limit) {
          toast({
            title: 'Melebihi Limit Harian',
            description: 'Total transaksi melebihi batas jajan harian santri yang ditentukan.',
            variant: 'destructive'
          });
          return;
        }
      }
    }

    setSubmittingOrder(true);
    const res = await createStudentJastipOrderAction({
      items: cartItemsList,
      notes: orderNotes,
      paymentMethod
    });
    setSubmittingOrder(false);

    if (res.success && res.data) {
      setCart({});
      setOrderNotes('');
      setCartDrawerOpen(false);
      setSuccessOrder(res.data);
      loadCatalogAndOrders();
    } else {
      toast({
        title: 'Gagal Membuat Pesanan',
        description: res.message,
        variant: 'destructive'
      });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-28 max-w-lg mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          asChild 
          className="rounded-full bg-white shadow-xs border-gray-200 h-10 px-3 font-bold text-xs"
        >
          <Link href="/home">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
          </Link>
        </Button>

        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Jastip Santri</p>
          <p className="text-xs font-black text-pink-600">Toko Kebutuhan Santri</p>
        </div>
      </div>

      {/* Hero Saldo Card for Student */}
      {studentInfo && (
        <Card className="rounded-[2.5rem] bg-gradient-to-br from-pink-600 via-rose-600 to-indigo-800 text-white border-none shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <CardContent className="p-6 relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/90">Layanan Jastip</span>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/20 text-[10px] font-bold">
                {studentInfo.class}
              </Badge>
            </div>

            <div>
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mb-0.5">Saldo Tabungan Santri</p>
              <p className="text-3xl font-black tracking-tight drop-shadow-sm">{formatRupiah(studentInfo.balance)}</p>
            </div>

            <div className="flex items-center justify-between bg-black/15 rounded-2xl p-3 border border-white/10 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">Status Santri:</span>
              <span className="text-[11px] font-black truncate">{studentInfo.name}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 rounded-2xl bg-muted/60 p-1.5 h-12">
          <TabsTrigger value="shop" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-1.5">
            <Store className="h-4 w-4" /> Katalog Belanja
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-1.5">
            <Receipt className="h-4 w-4" /> Pesanan Saya ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KATALOG BELANJA */}
        <TabsContent value="shop" className="space-y-4">
          {/* Search & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari sabun, snack, kitab, laundry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-2xl bg-white border-gray-100 shadow-xs font-medium text-sm"
              />
            </div>

            {/* Categories horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-xl font-bold text-xs h-8 whitespace-nowrap",
                    selectedCategory === cat ? "bg-pink-600 hover:bg-pink-700 text-white border-pink-600 shadow-sm" : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {cat === 'ALL' ? 'Semua Produk' : cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Product Items List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Menu Jastip...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-dashed border-2 rounded-[2.5rem] bg-white p-10 text-center shadow-xs">
              <div className="h-16 w-16 rounded-3xl bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-3">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Tidak Ada Produk Jastip</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Coba cari dengan kata kunci lain.' : 'Admin sekolah belum menambahkan menu jastip aktif.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map(item => {
                const inCart = cart[item.id];
                const isAvailable = item.is_available;

                return (
                  <Card key={item.id} className={cn(
                    "rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-xs",
                    !isAvailable && "opacity-60 bg-gray-50/80"
                  )}>
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          {!isAvailable && (
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              Habis
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-gray-900 leading-tight mb-1">{item.name}</h4>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2 font-medium">
                            {item.description}
                          </p>
                        )}
                        <p className="text-base font-black text-gray-900">{formatRupiah(item.price)}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-50">
                        {!isAvailable ? (
                          <Button disabled size="sm" className="w-full rounded-xl text-xs font-bold h-9 bg-gray-200 text-gray-400">
                            Stok Kosong
                          </Button>
                        ) : inCart ? (
                          <div className="flex items-center justify-between bg-pink-50 rounded-xl p-1 border border-pink-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDecreaseQuantity(item.id)}
                              className="h-7 w-7 rounded-lg text-pink-700 hover:bg-pink-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="font-black text-xs text-pink-700 px-2">
                              {inCart.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleAddToCart(item)}
                              className="h-7 w-7 rounded-lg text-pink-700 hover:bg-pink-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="w-full rounded-xl text-xs font-bold h-9 bg-pink-600 hover:bg-pink-700 text-white shadow-sm shadow-pink-100"
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: RIWAYAT PESANAN SAYA */}
        <TabsContent value="history" className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>
          ) : orders.length === 0 ? (
            <Card className="border-dashed border-2 rounded-[2.5rem] bg-white p-12 text-center shadow-xs">
              <div className="h-16 w-16 rounded-3xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center mb-3">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Belum Ada Riwayat Pesanan</h3>
              <p className="text-xs text-muted-foreground">
                Pesanan jastip yang telah Anda buat akan tampil di sini lengkap beserta status prosesnya.
              </p>
            </Card>
          ) : (
            orders.map(order => {
              const isPending = order.status === 'PENDING';
              const isProcess = order.status === 'DIPROSES';
              const isDone = order.status === 'SELESAI';
              const isCancel = order.status === 'DIBATALKAN';

              return (
                <Card key={order.id} className="rounded-3xl border-gray-100 bg-white shadow-xs overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {order.created_at ? format(parseISO(order.created_at), 'd MMM yyyy, HH:mm', { locale: id }) : '-'}
                        </p>
                      </div>

                      <Badge className={cn(
                        "rounded-lg text-[10px] font-black uppercase px-2.5 py-0.5",
                        isPending && "bg-amber-100 text-amber-800 border-amber-200",
                        isProcess && "bg-blue-100 text-blue-800 border-blue-200",
                        isDone && "bg-emerald-100 text-emerald-800 border-emerald-200",
                        isCancel && "bg-rose-100 text-rose-800 border-rose-200",
                      )}>
                        {order.status}
                      </Badge>
                    </div>

                    {/* Items List */}
                    <div className="bg-gray-50 rounded-2xl p-3 text-xs space-y-1.5 border border-gray-100">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">
                            {item.name} <strong className="text-pink-600 font-black">x{item.quantity}</strong>
                          </span>
                          <span className="font-bold text-gray-900">{formatRupiah(item.subtotal)}</span>
                        </div>
                      ))}
                      {order.notes && (
                        <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200/50">
                          💬 {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {order.payment_method === 'SALDO' ? '✅ Potong Saldo (Lunas)' : '💵 Bayar Mandiri / WA'}
                      </span>
                      <p className="text-base font-black text-gray-900">{formatRupiah(order.total_amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* FLOATING CART BAR */}
      {totalCartCount > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 px-4 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-6">
          <div className="bg-gray-900 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-3 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-pink-600 flex items-center justify-center shadow-md">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-white text-gray-900 rounded-full font-black text-[10px] flex items-center justify-center shadow">
                  {totalCartCount}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Belanja</p>
                <p className="text-lg font-black tracking-tight text-white">{formatRupiah(totalCartPrice)}</p>
              </div>
            </div>

            <Button
              onClick={() => setCartDrawerOpen(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs h-11 px-5 shadow-lg shadow-pink-900/50"
            >
              Checkout <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CHECKOUT DIALOG */}
      <Dialog open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-xl tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-pink-600" /> Rincian Keranjang Jastip
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Pastikan rincian barang dan metode pembayaran pesanan Anda sudah benar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* List of Cart Items */}
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
              {cartItemsList.map(item => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-bold text-xs text-gray-900">{item.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{formatRupiah(item.price)} per item</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDecreaseQuantity(item.id)}
                        className="h-6 w-6 rounded-lg"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-black text-xs px-2">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAddToCart({ id: item.id, name: item.name, price: item.price, category: '', is_available: true })}
                        className="h-6 w-6 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="h-7 w-7 text-gray-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">
                Catatan Kamar / Permintaan Khusus
              </Label>
              <Textarea
                placeholder="Contoh: Titip di Asrama Putra Kamar 4 / Warna Hitam"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
                className="rounded-2xl font-medium text-xs resize-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Pilih Metode Pembayaran</Label>
              
              <div className="grid grid-cols-1 gap-2">
                <div
                  onClick={() => setPaymentMethod('SALDO')}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                    paymentMethod === 'SALDO' ? "border-pink-600 bg-pink-50/50" : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    paymentMethod === 'SALDO' ? "bg-pink-600 text-white" : "bg-gray-200 text-gray-600"
                  )}>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-xs text-gray-900">Potong Saldo Tabungan</p>
                      {paymentMethod === 'SALDO' && <Check className="h-4 w-4 text-pink-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      Saldo Anda: <strong>{formatRupiah(studentInfo?.balance || 0)}</strong>
                    </p>
                    {studentInfo && studentInfo.balance < totalCartPrice && (
                      <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                        ⚠️ Saldo kurang Rp {(totalCartPrice - studentInfo.balance).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('WHATSAPP')}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3",
                    paymentMethod === 'WHATSAPP' ? "border-pink-600 bg-pink-50/50" : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    paymentMethod === 'WHATSAPP' ? "bg-pink-600 text-white" : "bg-gray-200 text-gray-600"
                  )}>
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-xs text-gray-900">Pesan via WhatsApp (Bayar Mandiri)</p>
                      {paymentMethod === 'WHATSAPP' && <Check className="h-4 w-4 text-pink-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      Pemesanan dikirim langsung ke WhatsApp PIC & bayar via transfer/tunai.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="p-4 rounded-2xl bg-gray-100 flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider text-gray-500">Total Pembayaran</span>
              <span className="font-black text-lg text-pink-600">{formatRupiah(totalCartPrice)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setCartDrawerOpen(false)} disabled={submittingOrder}>
              Batal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={submittingOrder}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-black h-12 px-6 shadow-lg shadow-pink-100 flex-1"
            >
              {submittingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              KONFIRMASI PESANAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUCCESS ORDER DIALOG */}
      <Dialog open={!!successOrder} onOpenChange={(open) => !open && setSuccessOrder(null)}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md text-center">
          <div className="py-4 space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-100 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900">Pesanan Jastip Berhasil!</h3>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                No. Pesanan: <span className="font-mono font-black text-gray-900">#{successOrder?.orderId.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-xs text-emerald-800 space-y-1">
              <p className="font-bold">
                Total Belanja: <strong>{formatRupiah(successOrder?.totalAmount || 0)}</strong>
              </p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Silakan klik tombol di bawah untuk membuka chat WhatsApp dan mengirim format pemesanan resmi ke pengurus/PIC toko santri.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => {
                  if (successOrder?.waLink) {
                    window.open(successOrder.waLink, '_blank');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black h-12 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 text-sm"
              >
                <MessageCircle className="h-5 w-5" /> KIRIM PESAN KE WHATSAPP
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSuccessOrder(null)}
                className="rounded-xl font-bold text-xs text-gray-500"
              >
                Tutup & Lihat Riwayat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
