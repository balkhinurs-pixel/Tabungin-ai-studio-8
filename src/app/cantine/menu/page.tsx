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
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  getCanteenItemsAction, 
  addCanteenItemAction, 
  updateCanteenItemAction, 
  deleteCanteenItemAction 
} from '../actions';

export default function CantineMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus menu "${name}"?`)) return;
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Katalog & Stok Kantin</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Kelola Menu & Stok POS Outlet</p>
        </div>
        <Button onClick={handleOpenAdd} className="rounded-2xl font-black text-xs gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Tambah Menu
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu makanan / minuman..."
            className="pl-10 h-11 rounded-2xl border-gray-200 text-xs font-bold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'Makanan', 'Minuman', 'Snack', 'Lainnya'].map(cat => (
            <Button
              key={cat}
              type="button"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              className="rounded-xl h-11 text-xs font-black px-4 whitespace-nowrap"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="border border-gray-100 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner",
                    item.category === 'Minuman' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                    item.category === 'Snack' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                    "bg-orange-50 text-orange-600 border border-orange-100"
                  )}>
                    {item.category === 'Minuman' ? '🥤' : item.category === 'Snack' ? '🍿' : '🍱'}
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                      {item.category || 'Makanan'}
                    </span>
                    <h3 className="font-black text-sm text-gray-900 mt-1">{item.name}</h3>
                    <p className="font-black text-primary text-sm mt-0.5">
                      Rp {item.price.toLocaleString('id-ID')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        item.stock > 10 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        item.stock > 0 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-rose-50 text-rose-600 border border-rose-100 font-extrabold"
                      )}>
                        Stok: {item.stock} {item.stock === 0 && '(Habis)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100" onClick={() => handleOpenEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={() => handleDelete(item.id, item.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Belum ada menu dikategori ini</p>
          <Button onClick={handleOpenAdd} variant="link" className="text-primary font-bold text-xs mt-2">
            + Tambah Menu Baru
          </Button>
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">
              {editingItem ? 'Edit Menu Kantin' : 'Tambah Menu Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-gray-500">Nama Makanan / Minuman</Label>
              <Input 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Nasi Goreng Spesial / Teh Manis"
                required
                className="h-11 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase text-gray-500">Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Makanan">Makanan</SelectItem>
                    <SelectItem value="Minuman">Minuman</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase text-gray-500">Stok Barang</Label>
                <Input 
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="Jumlah stok (misal: 50)"
                  min="0"
                  required
                  className="h-11 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-gray-500">Harga Jual (Rp)</Label>
              <Input 
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="Contoh: 10000"
                min="0"
                required
                className="h-11 rounded-xl text-xs font-bold"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-xl font-bold">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 rounded-xl font-black">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Menu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
