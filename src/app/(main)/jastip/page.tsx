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
  Check,
  X
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
    <div className="space-y-5 pb-28 sm:pb-12 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100 shadow-xs">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Jastip & Toko Santri</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-100 text-pink-700">
                Official
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 line-clamp-1">
              Katalog belanja santri, manajemen pesanan walisantri, & konfigurasi WhatsApp
            </p>
          </div>
        </div>

        <Button 
          onClick={handleOpenAdd} 
          className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl sm:rounded-2xl font-bold h-11 px-5 shadow-md shadow-pink-100 flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" /> 
          <span>Tambah Menu Jastip</span>
        </Button>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total Menu</p>
          <p className="text-lg sm:text-2xl font-black text-gray-900 mt-0.5">{items.length} <span className="text-xs font-semibold text-gray-400 hidden sm:inline">Item</span></p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Pesanan Baru</p>
          <p className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">
            {orders.filter(o => o.status === 'PENDING').length} <span className="text-xs font-semibold text-gray-400 hidden sm:inline">Pending</span>
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp PIC</p>
          <p className="text-sm sm:text-base font-black text-emerald-600 mt-1 truncate">
            {defaultWhatsApp ? `+${defaultWhatsApp}` : 'Belum Diatur'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        {/* Responsive, Clean, Non-overlapping Tab List */}
        <div className="bg-gray-100/90 p-1.5 rounded-2xl mb-5">
          <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0 gap-1">
            <TabsTrigger 
              value="catalog" 
              className="rounded-xl font-bold text-xs py-2.5 sm:py-3 data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Store className="h-4 w-4 shrink-0" />
              <span className="truncate">Katalog</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200/80 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700 font-black">
                {items.length}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="orders" 
              className="rounded-xl font-bold text-xs py-2.5 sm:py-3 data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 relative"
            >
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">Pesanan</span>
              {orders.filter(o => o.status === 'PENDING').length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                  {orders.filter(o => o.status === 'PENDING').length}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200/80 font-black">
                  {orders.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              value="settings" 
              className="rounded-xl font-bold text-xs py-2.5 sm:py-3 data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate">Kontak WA</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: KATALOG PRODUK */}
        <TabsContent value="catalog" className="space-y-4 focus-visible:outline-none">
          {/* Search and Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari menu jastip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 sm:h-11 rounded-xl sm:rounded-2xl bg-gray-50/80 border-gray-100 font-medium text-xs sm:text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <Button
                size="sm"
                variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "rounded-xl font-bold text-xs h-8 sm:h-9 whitespace-nowrap px-3",
                  selectedCategory === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                Semua ({items.length})
              </Button>
              {CATEGORIES.map(cat => {
                const count = items.filter(i => i.category === cat).length;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "rounded-xl font-bold text-xs h-8 sm:h-9 whitespace-nowrap px-3",
                      selectedCategory === cat ? 'bg-pink-600 text-white border-pink-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {cat} {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
                  </Button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 bg-white rounded-3xl border border-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Data Katalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-dashed border-2 rounded-3xl bg-white p-8 sm:p-12 text-center">
              <div className="h-16 w-16 rounded-3xl bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-3">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {searchQuery ? 'Menu Tidak Ditemukan' : 'Belum Ada Menu Jastip'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
                {searchQuery 
                  ? 'Tidak ada produk yang cocok dengan pencarian Anda. Silakan coba kata kunci lain.' 
                  : 'Tambahkan barang kebutuhan santri, snack, kitab, atau jasa laundry agar walisantri dapat memesan.'}
              </p>
              <Button onClick={handleOpenAdd} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs h-10 px-5">
                <Plus className="mr-1.5 h-4 w-4" /> Tambah Menu Baru
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className={cn(
                  "rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-2xs hover:shadow-md flex flex-col justify-between",
                  !item.is_available && "bg-gray-50/70 border-gray-200 opacity-80"
                )}>
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-lg text-[10px] font-black px-2.5 py-0.5 bg-pink-50 text-pink-700 border border-pink-100">
                          {item.category}
                        </Badge>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-100">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => handleToggleAvailability(item)}
                            className="data-[state=checked]:bg-emerald-500 scale-75 origin-right"
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
                      
                      <div className="mt-2 flex items-baseline justify-between">
                        <p className="text-lg font-black text-pink-600 tracking-tight">{formatRupiah(item.price)}</p>
                        {item.whatsapp_number && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> Khusus
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                        className="flex-1 rounded-xl font-bold text-xs h-9 border-gray-200 text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Menu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setItemToDelete(item)}
                        className="h-9 w-9 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-0 shrink-0"
                        title="Hapus Menu"
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
        <TabsContent value="orders" className="space-y-4 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
              {['ALL', 'PENDING', 'DIPROSES', 'SELESAI', 'DIBATALKAN'].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={orderStatusFilter === st ? 'default' : 'outline'}
                  onClick={() => setOrderStatusFilter(st)}
                  className={cn(
                    "rounded-xl font-bold text-xs h-8 whitespace-nowrap px-2.5 sm:px-3",
                    orderStatusFilter === st 
                      ? (st === 'PENDING' ? 'bg-amber-600 text-white' : st === 'DIPROSES' ? 'bg-blue-600 text-white' : st === 'SELESAI' ? 'bg-emerald-600 text-white' : st === 'DIBATALKAN' ? 'bg-rose-600 text-white' : 'bg-gray-900 text-white')
                      : "text-gray-600 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {st === 'ALL' ? 'Semua' : st}
                </Button>
              ))}
            </div>
            <p className="text-xs font-bold text-gray-500 whitespace-nowrap self-end sm:self-center">
              Total: {filteredOrders.length} Pesanan
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 bg-white rounded-3xl border border-gray-100">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="border-dashed border-2 rounded-3xl bg-white p-8 sm:p-12 text-center">
              <div className="h-16 w-16 rounded-3xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
                <Receipt className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Belum Ada Pesanan Masuk</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ketika walisantri memesan barang dari menu jastip mereka, rincian pesanan akan otomatis tampil di sini.
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
                  <Card key={order.id} className="rounded-2xl sm:rounded-3xl border-gray-100 shadow-2xs bg-white overflow-hidden hover:shadow-sm transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Info */}
                        <div className="space-y-2.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black bg-gray-100 px-2 py-0.5 rounded-lg text-gray-700">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-400">
                              {order.created_at ? format(parseISO(order.created_at), 'd MMM yyyy, HH:mm', { locale: id }) : '-'}
                            </span>
                            
                            <Badge className={cn(
                              "rounded-lg text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border",
                              isPending && "bg-amber-50 text-amber-800 border-amber-200",
                              isProcess && "bg-blue-50 text-blue-800 border-blue-200",
                              isDone && "bg-emerald-50 text-emerald-800 border-emerald-200",
                              isCancel && "bg-rose-50 text-rose-800 border-rose-200",
                            )}>
                              {order.status}
                            </Badge>

                            <Badge variant="outline" className={cn(
                              "rounded-lg text-[10px] font-bold px-2 py-0.5 border",
                              order.payment_method === 'SALDO' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"
                            )}>
                              {order.payment_method === 'SALDO' ? '✅ Potong Saldo' : '💵 Bayar Mandiri / WA'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-black text-sm shrink-0 border border-pink-100">
                              {order.students?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-black text-sm text-gray-900">
                                {order.students?.name || 'Nama Santri'}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-semibold">
                                Kelas: {order.students?.class || '-'} • NIS: {order.students?.nis ? (order.students.nis.includes('_arc_') ? order.students.nis.split('_arc_')[0] : order.students.nis) : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Items summary */}
                          <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-gray-100 text-xs space-y-1.5">
                            <div className="font-bold text-gray-700 flex flex-wrap gap-1.5">
                              {order.items?.map((it, idx) => (
                                <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-gray-200/80 text-[11px] shadow-2xs">
                                  {it.name} <strong className="text-pink-600">x{it.quantity}</strong>
                                </span>
                              ))}
                            </div>
                            {order.notes && (
                              <p className="text-[11px] text-gray-500 italic">
                                💬 <strong>Catatan:</strong> {order.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Total & Status Controls */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100">
                          <div className="text-left lg:text-right">
                            <p className="text-[9px] uppercase font-black tracking-widest text-gray-400">Total Tagihan</p>
                            <p className="text-lg sm:text-xl font-black text-gray-900">{formatRupiah(order.total_amount)}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {cleanStudentWa && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl font-bold text-xs h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-2.5"
                                onClick={() => window.open(`https://wa.me/${cleanStudentWa}?text=Halo%20Walisantri,%20pesanan%20jastip%20#${order.id.slice(0,8).toUpperCase()}%20sedang%20kami%20tindaklanjuti.`, '_blank')}
                                title="Kirim WA ke Walisantri"
                              >
                                <MessageCircle className="h-4 w-4 sm:mr-1 text-emerald-600" />
                                <span className="hidden sm:inline">Chat WA</span>
                              </Button>
                            )}

                            <Select
                              value={order.status}
                              onValueChange={(val) => handleUpdateOrderStatus(order.id, val as any)}
                            >
                              <SelectTrigger className="h-9 w-32 sm:w-36 rounded-xl text-xs font-bold bg-gray-50 border-gray-200">
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
        <TabsContent value="settings" className="space-y-4 focus-visible:outline-none">
          <Card className="rounded-2xl sm:rounded-3xl border-gray-100 shadow-xs bg-white overflow-hidden">
            <CardHeader className="bg-pink-50/40 border-b border-pink-100/50 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-gray-900">Nomor WhatsApp PIC Jastip</CardTitle>
                  <CardDescription className="text-xs font-medium">
                    Nomor WhatsApp pengurus atau PIC toko sekolah untuk menerima konfirmasi pemesanan dari santri & walisantri.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <div className="space-y-2 max-w-md">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-600">Nomor WhatsApp Pengurus / Toko</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    value={defaultWhatsApp}
                    onChange={(e) => setDefaultWhatsApp(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 h-12 rounded-xl sm:rounded-2xl font-bold bg-gray-50/80 text-sm sm:text-base border-gray-200"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Setiap kali santri checkout pesanan jastip, sistem akan mengarahkan format pemesanan otomatis ke nomor ini.
                </p>
              </div>

              <Button
                onClick={handleSaveWhatsApp}
                disabled={savingWhatsApp}
                className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl sm:rounded-2xl font-bold h-11 sm:h-12 px-6 shadow-md shadow-pink-100 transition-transform active:scale-95"
              >
                {savingWhatsApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Simpan Nomor WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG TAMBAH / EDIT ITEM */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg p-5 sm:p-6 border-gray-100 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="font-black text-lg sm:text-xl tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-pink-600" />
              {editingItem ? 'Edit Menu Jastip' : 'Tambah Menu Jastip Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500">
              Isi rincian barang atau jasa jastip yang akan ditampilkan pada katalog santri & walisantri.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-600">Nama Barang / Jasa</Label>
              <Input
                placeholder="Misal: Paket Sabun & Sikat Gigi Santri"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-11 rounded-xl font-bold bg-gray-50/70 border-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-600">Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 rounded-xl font-bold bg-gray-50/70 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="font-bold text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-gray-600">Harga Satuan (Rp)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 15000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value.replace(/\D/g, ''))}
                  className="h-11 rounded-xl font-black text-pink-600 bg-gray-50/70 border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-600">Deskripsi / Detail (Opsional)</Label>
              <Textarea
                placeholder="Misal: Merek Lifebuoy 85gr + Pepsodent 120gr + Sikat Gigi Lembut"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="rounded-xl font-medium text-xs resize-none bg-gray-50/70 border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-gray-600">No. WhatsApp Khusus (Opsional)</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Kosongkan jika menggunakan no. WA utama"
                  value={formWhatsApp}
                  onChange={(e) => setFormWhatsApp(e.target.value.replace(/\D/g, ''))}
                  className="pl-10 h-11 rounded-xl font-semibold text-xs bg-gray-50/70 border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-xs font-black text-gray-900">Status Ketersediaan</p>
                <p className="text-[11px] text-muted-foreground font-medium">Tersedia untuk dipesan walisantri</p>
              </div>
              <Switch
                checked={formIsAvailable}
                onCheckedChange={setFormIsAvailable}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-gray-100 flex flex-row justify-end">
            <Button variant="ghost" className="rounded-xl font-bold text-xs h-10" onClick={() => setItemDialogOpen(false)} disabled={savingItem}>
              Batal
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={savingItem}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black text-xs px-5 h-10 shadow-md shadow-pink-100"
            >
              {savingItem ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG HAPUS ITEM */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md p-5 sm:p-6 border-gray-100 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle className="font-black text-base">Hapus Menu Jastip?</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-gray-600">
              Apakah Anda yakin ingin menghapus <span className="font-black text-gray-900">{itemToDelete?.name}</span>? Tindakan ini akan menghapus menu dari katalog santri.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3 flex flex-row justify-end">
            <Button variant="ghost" className="rounded-xl font-bold text-xs h-10" onClick={() => setItemToDelete(null)} disabled={deletingItem}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deletingItem}
              className="rounded-xl font-black text-xs h-10 shadow-md shadow-rose-100"
            >
              {deletingItem ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
