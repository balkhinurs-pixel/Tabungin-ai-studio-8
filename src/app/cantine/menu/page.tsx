'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UtensilsCrossed, 
  Package, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Grid,
  List,
  ArrowUpDown,
  RefreshCw,
  Minus,
  Sparkles,
  DollarSign,
  Boxes
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  getCanteenItemsAction, 
  addCanteenItemAction, 
  updateCanteenItemAction, 
  deleteCanteenItemAction,
  quickAdjustStockAction
} from '../actions';

export default function CantineMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Makanan');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');

  const { toast } = useToast();

  const loadItems = async () => {
    setLoading(true);
    const data = await getCanteenItemsAction();
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormCategory('Makanan');
    setFormPrice('');
    setFormStock('');
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || 'Makanan');
    setFormPrice(item.price.toString());
    setFormStock(item.stock.toString());
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      toast({ title: 'Nama dan Harga Wajib Diisi', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const priceNum = parseInt(formPrice) || 0;
    const stockNum = parseInt(formStock) || 0;

    let res;
    if (editingItem) {
      res = await updateCanteenItemAction(editingItem.id, {
        name: formName,
        category: formCategory,
        price: priceNum,
        stock: stockNum
      });
    } else {
      res = await addCanteenItemAction({
        name: formName,
        category: formCategory,
        price: priceNum,
        stock: stockNum
      });
    }

    setSubmitting(false);
    if (res.success) {
      toast({ title: res.message });
      setIsAddOpen(false);
      resetForm();
      loadItems();
    } else {
      toast({ title: res.message, variant: 'destructive' });
    }
  };

  const handleQuickAdjustStock = async (id: string, delta: number) => {
    setUpdatingStockId(id);
    const res = await quickAdjustStockAction(id, delta);
    setUpdatingStockId(null);

    if (res.success) {
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          const newStock = Math.max(0, item.stock + delta);
          return { ...item, stock: newStock, is_available: newStock > 0 };
        }
        return item;
      }));
      toast({ title: res.message });
    } else {
      toast({ title: res.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus menu "${name}"?`)) return;
    const res = await deleteCanteenItemAction(id);
    if (res.success) {
      toast({ title: res.message });
      loadItems();
    } else {
      toast({ title: res.message, variant: 'destructive' });
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Analytics Stats
  const totalItemsCount = items.length;
  const lowStockCount = items.filter(i => i.stock <= 5).length;
  const totalStockValue = items.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);

  const categories = ['ALL', 'Makanan', 'Minuman', 'Snack', 'Paket', 'Lainnya'];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600 font-bold">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">Katalog & Stok Kantin</h1>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Manajemen Produk & Stok POS petugas Kantin</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadItems} className="rounded-2xl h-11 w-11 border-gray-200">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={handleOpenAdd} className="rounded-2xl h-11 font-black text-xs gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white px-5">
            <Plus className="h-4 w-4" /> Tambah Menu Baru
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-gray-100 rounded-3xl bg-white shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Jenis Menu</p>
              <h3 className="text-2xl font-black text-gray-900 mt-0.5">{totalItemsCount} <span className="text-xs font-bold text-gray-400">Item</span></h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border rounded-3xl shadow-sm overflow-hidden transition-all",
          lowStockCount > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-white"
        )}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Perlu Restock (Stok ≤ 5)</p>
              <h3 className="text-2xl font-black text-amber-900 mt-0.5">{lowStockCount} <span className="text-xs font-bold text-amber-600">Menu</span></h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 rounded-3xl bg-white shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Estimasi Nilai Stok</p>
              <h3 className="text-xl font-black text-emerald-600 mt-0.5">Rp {totalStockValue.toLocaleString('id-ID')}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter, Search & View Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama menu / makanan..."
            className="pl-10 h-10 rounded-2xl border-gray-200 text-xs font-bold"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                selectedCategory === cat 
                  ? "bg-gray-900 text-white shadow-sm" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'GRID' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={cn(
              "p-2 rounded-xl transition-all",
              viewMode === 'TABLE' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Menu Catalog View */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length > 0 ? (
        viewMode === 'GRID' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const isLow = item.stock <= 5 && item.stock > 0;
              const isEmpty = item.stock === 0;

              return (
                <Card 
                  key={item.id} 
                  className={cn(
                    "border rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md bg-white flex flex-col justify-between",
                    isEmpty ? "border-rose-200 bg-rose-50/20" : isLow ? "border-amber-200" : "border-gray-100"
                  )}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Top Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0",
                          item.category === 'Minuman' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          item.category === 'Snack' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          item.category === 'Paket' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                          "bg-orange-50 text-orange-600 border border-orange-100"
                        )}>
                          {item.category === 'Minuman' ? '🥤' : item.category === 'Snack' ? '🍿' : item.category === 'Paket' ? '🍱' : '🍞'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                            {item.category || 'Makanan'}
                          </span>
                          <h3 className="font-black text-sm text-gray-900 truncate mt-1">{item.name}</h3>
                          <p className="font-black text-primary text-base">
                            Rp {item.price.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {/* Action Menu Buttons */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.name)}
                          className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stock Quick Controller Bar */}
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Sisa Stok Barang
                        </span>
                        <span className={cn(
                          "font-black text-xs px-2.5 py-0.5 rounded-full",
                          isEmpty ? "bg-rose-500 text-white" :
                          isLow ? "bg-amber-500 text-white animate-pulse" :
                          "bg-emerald-100 text-emerald-800"
                        )}>
                          {isEmpty ? 'HABIS' : `${item.stock} porsi`}
                        </span>
                      </div>

                      {/* Quick Adjustment Buttons */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={item.stock <= 0 || updatingStockId === item.id}
                            onClick={() => handleQuickAdjustStock(item.id, -1)}
                            className="h-8 px-2.5 rounded-xl font-bold text-xs bg-white hover:bg-gray-100 border-gray-200"
                          >
                            -1
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingStockId === item.id}
                            onClick={() => handleQuickAdjustStock(item.id, 1)}
                            className="h-8 px-2.5 rounded-xl font-bold text-xs bg-white hover:bg-gray-100 border-gray-200"
                          >
                            +1
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            disabled={updatingStockId === item.id}
                            onClick={() => handleQuickAdjustStock(item.id, 5)}
                            className="h-8 px-2.5 rounded-xl font-black text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                          >
                            +5 Stok
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            disabled={updatingStockId === item.id}
                            onClick={() => handleQuickAdjustStock(item.id, 10)}
                            className="h-8 px-2.5 rounded-xl font-black text-[11px] bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            +10
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW FOR DESKTOP AUDIT */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Nama Menu</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Harga Jual</th>
                    <th className="p-4">Sisa Stok</th>
                    <th className="p-4 text-center">Atur Stok Cepat</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-black text-gray-900 text-sm">{item.name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] uppercase font-extrabold">
                          {item.category || 'Makanan'}
                        </span>
                      </td>
                      <td className="p-4 text-primary font-black text-sm">Rp {item.price.toLocaleString('id-ID')}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-extrabold",
                          item.stock === 0 ? "bg-rose-100 text-rose-700" :
                          item.stock <= 5 ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-800"
                        )}>
                          {item.stock} {item.stock === 0 ? '(Habis)' : 'unit'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleQuickAdjustStock(item.id, -1)} className="h-7 px-2 rounded-lg text-xs">
                            -1
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleQuickAdjustStock(item.id, 1)} className="h-7 px-2 rounded-lg text-xs">
                            +1
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleQuickAdjustStock(item.id, 5)} className="h-7 px-2 rounded-lg text-xs bg-emerald-50 text-emerald-700">
                            +5
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(item)} className="h-8 w-8 rounded-xl bg-gray-100">
                            <Edit className="h-3.5 w-3.5 text-gray-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id, item.name)} className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-white">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="font-black text-gray-700 text-sm">Tidak Ada Menu Kantin</h3>
          <p className="text-xs font-bold text-gray-400 mt-1">Belum ada menu yang didaftarkan di kategori ini.</p>
          <Button onClick={handleOpenAdd} className="mt-4 rounded-xl font-black text-xs">
            + Tambah Menu Pertama
          </Button>
        </div>
      )}

      {/* Modal Dialog Tambah / Edit Menu */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-3xl max-w-md bg-white border border-gray-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
              {editingItem ? 'Edit Menu Kantin' : 'Tambah Menu Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 font-bold">
              Isi rincian nama, kategori, harga jual, dan jumlah stok barang kantin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-gray-500">Nama Makanan / Minuman</Label>
              <Input 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Nasi Goreng Telur / Es Teh Manis"
                required
                className="h-11 rounded-2xl text-xs font-bold border-gray-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase text-gray-500">Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 rounded-2xl text-xs font-bold border-gray-200">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Makanan">🍱 Makanan</SelectItem>
                    <SelectItem value="Minuman">🥤 Minuman</SelectItem>
                    <SelectItem value="Snack">🍿 Snack</SelectItem>
                    <SelectItem value="Paket">🍱 Paket Hemat</SelectItem>
                    <SelectItem value="Lainnya">📦 Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase text-gray-500">Harga Jual (Rp)</Label>
                <Input 
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Contoh: 12000"
                  min="0"
                  required
                  className="h-11 rounded-2xl text-xs font-bold border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-black uppercase text-gray-500">Jumlah Stok Awal</Label>
                <div className="flex gap-1">
                  {[10, 25, 50].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormStock(num.toString())}
                      className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[10px] font-black text-gray-600"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
              <Input 
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="Jumlah porsi/unit (misal: 50)"
                min="0"
                required
                className="h-11 rounded-2xl text-xs font-bold border-gray-200"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl font-bold border-gray-200">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 rounded-xl font-black bg-primary text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Menu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
