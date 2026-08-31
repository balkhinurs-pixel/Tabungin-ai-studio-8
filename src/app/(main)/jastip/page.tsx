'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit3, 
  Phone, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Save, 
  Loader2, 
  Store, 
  Sparkles, 
  Receipt,
  MessageCircle,
  AlertCircle,
  Filter,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { JastipItem, JastipOrder } from '@/types';
import {
  getAdminJastipItemsAction,
  saveJastipItemAction,
  deleteJastipItemAction,
  toggleJastipAvailabilityAction,
  getDefaultJastipConfigAction,
  updateDefaultJastipWhatsAppAction,
  getAdminJastipOrdersAction,
  updateJastipOrderStatusAction
} from './actions';

const CATEGORIES = [
  'Kebutuhan Santri',
  'Makanan & Minuman',
  'Perlengkapan Mandi',
  'Kitab & Buku',
  'Alat Tulis',
  'Laundry & Jasa',
  'Lainnya'
];

export default function JastipManagementPage() {
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<JastipItem[]>([]);
  const [orders, setOrders] = useState<JastipOrder[]>([]);
  const [defaultWhatsApp, setDefaultWhatsApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Item Form Modal
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JastipItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWhatsApp, setFormWhatsApp] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  // Delete Item State
  const [itemToDelete, setItemToDelete] = useState<JastipItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<JastipOrder | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, ordersData, configData] = await Promise.all([
        getAdminJastipItemsAction(),
        getAdminJastipOrdersAction(),
        getDefaultJastipConfigAction()
      ]);
      setItems(itemsData);
      setOrders(ordersData);
      setDefaultWhatsApp(configData.default_jastip_whatsapp || '');
    } catch (err) {
      console.error('Failed to load jastip data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory(CATEGORIES[0]);
    setFormPrice('');
    setFormDescription('');
    setFormWhatsApp('');
    setFormIsAvailable(true);
    setItemDialogOpen(true);
  };

  const handleOpenEdit = (item: JastipItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || CATEGORIES[0]);
    setFormPrice(item.price.toString());
    setFormDescription(item.description || '');
    setFormWhatsApp(item.whatsapp_number || '');
    setFormIsAvailable(item.is_available);
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      toast({ title: 'Nama Produk Wajib', description: 'Masukkan nama item jastip.', variant: 'destructive' });
      return;
    }
    const priceNum = parseInt(formPrice.replace(/\D/g, '')) || 0;
    if (priceNum <= 0) {
      toast({ title: 'Harga Tidak Valid', description: 'Masukkan harga yang lebih dari 0.', variant: 'destructive' });
      return;
    }

    setSavingItem(true);
    const res = await saveJastipItemAction({
      id: editingItem?.id,
      name: formName,
      category: formCategory,
      price: priceNum,
      description: formDescription,
      whatsapp_number: formWhatsApp,
      is_available: formIsAvailable
    });
    setSavingItem(false);

    if (res.success) {
      toast({ title: 'Berhasil', description: res.message });
      setItemDialogOpen(false);
      loadData();
    } else {
      toast({ title: 'Gagal Menyimpan', description: res.message, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    const res = await deleteJastipItemAction(itemToDelete.id);
    setDeletingItem(false);

    if (res.success) {
      toast({ title: 'Berhasil', description: res.message });
      setItemToDelete(null);
      loadData();
    } else {
      toast({ title: 'Gagal Menghapus', description: res.message, variant: 'destructive' });
    }
  };

  const handleToggleAvailability = async (item: JastipItem) => {
    const nextStatus = !item.is_available;
    // Optimistic update
    setItems(items.map(i => i.id === item.id ? { ...i, is_available: nextStatus } : i));
    const res = await toggleJastipAvailabilityAction(item.id, nextStatus);
    if (!res.success) {
      toast({ title: 'Gagal', description: res.message, variant: 'destructive' });
      loadData();
    } else {
      toast({ title: 'Status Diperbarui', description: `${item.name} kini ${nextStatus ? 'Tersedia' : 'Habis'}.` });
    }
  };

  const handleSaveWhatsApp = async () => {
    setSavingWhatsApp(true);
    const res = await updateDefaultJastipWhatsAppAction(defaultWhatsApp);
    setSavingWhatsApp(false);

    if (res.success) {
      toast({ title: 'Tersimpan', description: res.message });
    } else {
      toast({ title: 'Gagal', description: res.message, variant: 'destructive' });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'PENDING' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN') => {
    const res = await updateJastipOrderStatusAction(orderId, status);
    if (res.success) {
      toast({ title: 'Status Pesanan Diubah', description: `Pesanan diubah menjadi ${status}.` });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } else {
      toast({ title: 'Gagal Mengubah Status', description: res.message, variant: 'destructive' });
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter === 'ALL') return true;
    return order.status === orderStatusFilter;
  });

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Jastip & Toko Santri</h1>
              <p className="text-xs font-semibold text-muted-foreground">Kelola katalog jastip, harga produk, no. WhatsApp, & pesanan walisantri</p>
            </div>
          </div>
        </div>

        <Button onClick={handleOpenAdd} className="bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold h-11 shadow-lg shadow-pink-100">
          <Plus className="mr-2 h-4 w-4" /> Tambah Menu Jastip
        </Button>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 rounded-2xl bg-muted/60 p-1.5 h-14">
          <TabsTrigger value="catalog" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-2">
            <Store className="h-4 w-4" /> Katalog Produk ({items.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-2">
            <Receipt className="h-4 w-4" /> Pesanan Masuk ({orders.filter(o => o.status === 'PENDING').length} Baru)
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl font-bold text-xs uppercase tracking-wider gap-2">
            <Phone className="h-4 w-4" /> Kontak WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KATALOG PRODUK */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama barang jastip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-2xl bg-gray-50/70 border-gray-100 font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-4 w-4 text-gray-400 shrink-0 hidden sm:block" />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('ALL')}
                  className={cn("rounded-xl font-bold text-xs h-9", selectedCategory === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-600')}
                >
                  Semua
                </Button>
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn("rounded-xl font-bold text-xs h-9 whitespace-nowrap", selectedCategory === cat ? 'bg-pink-600 text-white' : 'text-gray-600')}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Katalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-dashed border-2 rounded-[2.5rem] bg-gray-50/50 p-12 text-center">
              <div className="h-16 w-16 rounded-3xl bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Belum Ada Menu Jastip</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
                Tambahkan barang titipan, perlengkapan santri, snack, atau jasa laundry agar walisantri bisa memesan dari dashboard mereka.
              </p>
              <Button onClick={handleOpenAdd} className="bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold">
                <Plus className="mr-2 h-4 w-4" /> Tambah Item Pertama
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className={cn(
                  "rounded-3xl border transition-all duration-200 overflow-hidden group hover:shadow-md",
                  item.is_available ? "border-gray-100 bg-white" : "border-gray-200 bg-gray-50/70 opacity-80"
                )}>
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-lg text-[10px] font-bold px-2.5 py-0.5 bg-pink-50 text-pink-700 border-pink-100">
                          {item.category}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => handleToggleAvailability(item)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider",
                            item.is_available ? "text-emerald-600" : "text-rose-500"
                          )}>
                            {item.is_available ? 'Tersedia' : 'Habis'}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-black text-base text-gray-900 leading-tight mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2 font-medium">
                          {item.description}
                        </p>
                      )}
                      <p className="text-lg font-black text-pink-600 tracking-tight">{formatRupiah(item.price)}</p>

                      {item.whatsapp_number && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 font-semibold">
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WA: +{item.whatsapp_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                        className="flex-1 rounded-xl font-bold text-xs h-9 border-gray-200 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Menu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setItemToDelete(item)}
                        className="h-9 w-9 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PESANAN MASUK */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline mr-2">Filter Status:</span>
              {['ALL', 'PENDING', 'DIPROSES', 'SELESAI', 'DIBATALKAN'].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={orderStatusFilter === st ? 'default' : 'outline'}
                  onClick={() => setOrderStatusFilter(st)}
                  className={cn(
                    "rounded-xl font-bold text-xs h-8",
                    orderStatusFilter === st ? "bg-gray-900 text-white" : "text-gray-600"
                  )}
                >
                  {st === 'ALL' ? 'Semua Pesanan' : st}
                </Button>
              ))}
            </div>
            <p className="text-xs font-bold text-muted-foreground">{filteredOrders.length} Pesanan</p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>
          ) : filteredOrders.length === 0 ? (
            <Card className="border-dashed border-2 rounded-[2.5rem] bg-gray-50/50 p-12 text-center">
              <div className="h-16 w-16 rounded-3xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Belum Ada Pesanan Jastip</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ketika walisantri memesan barang dari menu jastip mereka, pesanan akan otomatis tercatat di sini.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const isPending = order.status === 'PENDING';
                const isProcess = order.status === 'DIPROSES';
                const isDone = order.status === 'SELESAI';
                const isCancel = order.status === 'DIBATALKAN';

                const studentWa = order.students?.whatsapp_number;
                const cleanStudentWa = studentWa ? (studentWa.startsWith('0') ? '62' + studentWa.slice(1) : studentWa) : null;

                return (
                  <Card key={order.id} className="rounded-3xl border-gray-100 shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Info Santri & Order */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black bg-gray-100 px-2.5 py-1 rounded-lg text-gray-700">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400">
                              {order.created_at ? format(parseISO(order.created_at), 'd MMM yyyy, HH:mm', { locale: id }) : '-'}
                            </span>
                            
                            {/* Status Badge */}
                            <Badge className={cn(
                              "rounded-lg text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5",
                              isPending && "bg-amber-100 text-amber-800 border-amber-200",
                              isProcess && "bg-blue-100 text-blue-800 border-blue-200",
                              isDone && "bg-emerald-100 text-emerald-800 border-emerald-200",
                              isCancel && "bg-rose-100 text-rose-800 border-rose-200",
                            )}>
                              {order.status}
                            </Badge>

                            {/* Payment Badge */}
                            <Badge variant="outline" className={cn(
                              "rounded-lg text-[10px] font-bold px-2 py-0.5",
                              order.payment_method === 'SALDO' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"
                            )}>
                              {order.payment_method === 'SALDO' ? '✅ Potong Saldo (Lunas)' : '💵 Bayar Mandiri / WA'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-black text-sm">
                              {order.students?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-black text-sm text-gray-900">
                                {order.students?.name || 'Nama Santri'}
                              </p>
                              <p className="text-xs text-muted-foreground font-semibold">
                                Kelas: {order.students?.class || '-'} • NIS: {order.students?.nis || '-'}
                              </p>
                            </div>
                          </div>

                          {/* Items summary */}
                          <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 text-xs space-y-1">
                            <div className="font-bold text-gray-700 flex flex-wrap gap-2">
                              {order.items?.map((it, idx) => (
                                <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-gray-200/60 shadow-2xs">
                                  {it.name} <strong className="text-pink-600">x{it.quantity}</strong>
                                </span>
                              ))}
                            </div>
                            {order.notes && (
                              <p className="text-[11px] text-gray-500 italic mt-1">
                                💬 <strong>Catatan / Kamar:</strong> {order.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Total & Status Controls */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                          <div className="text-left lg:text-right">
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Total Tagihan</p>
                            <p className="text-xl font-black text-gray-900">{formatRupiah(order.total_amount)}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {cleanStudentWa && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl font-bold text-xs h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => window.open(`https://wa.me/${cleanStudentWa}?text=Halo%20Walisantri,%20pesanan%20jastip%20#${order.id.slice(0,8)}%20sedang%20kami%20tindaklanjuti.`, '_blank')}
                              >
                                <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Chat Walisantri
                              </Button>
                            )}

                            <Select
                              value={order.status}
                              onValueChange={(val) => handleUpdateOrderStatus(order.id, val as any)}
                            >
                              <SelectTrigger className="h-9 w-36 rounded-xl text-xs font-bold bg-gray-50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                <SelectItem value="PENDING" className="text-xs font-bold text-amber-700">PENDING</SelectItem>
                                <SelectItem value="DIPROSES" className="text-xs font-bold text-blue-700">DIPROSES</SelectItem>
                                <SelectItem value="SELESAI" className="text-xs font-bold text-emerald-700">SELESAI</SelectItem>
                                <SelectItem value="DIBATALKAN" className="text-xs font-bold text-rose-700">DIBATALKAN</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: PENGATURAN KONTAK WHATSAPP */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="rounded-3xl border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-pink-50/50 border-b border-pink-100/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-gray-900">Nomor WhatsApp Utama Jastip</CardTitle>
                  <CardDescription className="text-xs">
                    Nomor ini menjadi tujuan pengiriman format chat pemesanan dari walisantri jika item tidak memiliki no. HP khusus.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2 max-w-md">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Nomor WhatsApp Pengurus / PIC Toko</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    value={defaultWhatsApp}
                    onChange={(e) => setDefaultWhatsApp(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 h-12 rounded-2xl font-bold bg-gray-50 text-base"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan nomor WhatsApp aktif yang menerima notifikasi dan pesanan santri.
                </p>
              </div>

              <Button
                onClick={handleSaveWhatsApp}
                disabled={savingWhatsApp}
                className="bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold h-12 px-6 shadow-lg shadow-pink-100"
              >
                {savingWhatsApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                SIMPAN NOMOR WHATSAPP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG TAMBAH / EDIT ITEM */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black text-xl tracking-tight text-gray-900">
              {editingItem ? 'Edit Menu Jastip' : 'Tambah Menu Jastip Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Isi rincian barang atau jasa jastip yang ingin ditampilkan di katalog walisantri.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Nama Barang / Jasa</Label>
              <Input
                placeholder="Misal: Paket Sabun & Sikat Gigi Santri"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 rounded-2xl font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-12 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Harga Satuan (Rp)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 15000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value.replace(/\D/g, ''))}
                  className="h-12 rounded-2xl font-black text-pink-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">Deskripsi / Detail Barang (Opsional)</Label>
              <Textarea
                placeholder="Misal: Merek Lifebuoy 85gr + Pepsodent 120gr + Sikat Gigi Lembut"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="rounded-2xl font-medium text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-500">No. WhatsApp PIC Khusus Item Ini (Opsional)</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Kosongkan jika menggunakan no. WA utama sekolah"
                  value={formWhatsApp}
                  onChange={(e) => setFormWhatsApp(e.target.value.replace(/\D/g, ''))}
                  className="pl-10 h-12 rounded-2xl font-semibold text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-xs font-black text-gray-900">Status Ketersediaan</p>
                <p className="text-[11px] text-muted-foreground">Aktifkan agar walisantri bisa memesan produk ini.</p>
              </div>
              <Switch
                checked={formIsAvailable}
                onCheckedChange={setFormIsAvailable}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setItemDialogOpen(false)} disabled={savingItem}>
              Batal
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={savingItem}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-black px-6 shadow-lg shadow-pink-100 flex-1 sm:flex-none"
            >
              {savingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {editingItem ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN MENU'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG HAPUS ITEM */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle className="font-black">Hapus Menu Jastip?</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium">
              Apakah Anda yakin ingin menghapus <span className="font-black text-gray-900">{itemToDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setItemToDelete(null)} disabled={deletingItem}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deletingItem}
              className="rounded-xl font-black shadow-lg shadow-rose-100"
            >
              {deletingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              HAPUS PERMANEN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
