
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Banknote, UtensilsCrossed, AlertTriangle, History, ShieldEllipsis } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import CantineManagement from '../settings/_components/CantineManagement';
import SettlementManagement from '../settings/_components/SettlementManagement';
import SettlementHistory from '../settings/_components/SettlementHistory';
import AdminFeeManagement from '../settings/_components/AdminFeeManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TeacherSettlementPage() {
  const supabase = createClient();
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('school_code')
                .eq('id', user.id)
                .single();
            
            if (data) setSchoolCode(data.school_code);
        }
        setLoading(false);
    }
    fetchProfile();
  }, [supabase]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="rounded-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
            <h2 className="text-xl font-bold tracking-tight text-primary">Manajemen Keuangan</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Kantin & Biaya Admin</p>
        </div>
      </div>

      <Tabs defaultValue="settle" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 rounded-2xl bg-muted/50 p-1.5 h-14">
          <TabsTrigger value="settle" className="rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
             <Banknote className="h-3.5 w-3.5" /> Tagihan
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
             <History className="h-3.5 w-3.5" /> Jurnal
          </TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
             <ShieldEllipsis className="h-3.5 w-3.5" /> Admin
          </TabsTrigger>
          <TabsTrigger value="outlets" className="rounded-xl font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
             <UtensilsCrossed className="h-3.5 w-3.5" /> Outlet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settle" className="space-y-4">
            <Card className="shadow-sm border-emerald-100 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Pencairan Omzet</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium">Uang fisik yang harus diserahkan ke kantin hari ini.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <SettlementManagement />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
            <Card className="shadow-sm border-blue-100 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Riwayat Bayar</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium">Daftar transaksi kantin yang sudah Anda bayarkan.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <SettlementHistory />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
            <Card className="shadow-sm border-indigo-100 overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                        <ShieldEllipsis className="h-5 w-5 text-indigo-600" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Potongan Administrasi</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium">Manajemen biaya admin bulanan untuk seluruh siswa.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <AdminFeeManagement />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="outlets" className="space-y-4">
            <Card className="shadow-sm border-orange-100 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-orange-50/50 border-b border-orange-100">
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Akun Petugas</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium">Daftarkan atau hapus akses akun login untuk pengelola kantin.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="h-20 animate-pulse bg-muted rounded-xl" />
                    ) : schoolCode ? (
                        <CantineManagement />
                    ) : (
                        <Alert variant="destructive" className="rounded-2xl">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Mohon atur <strong>Kode Sekolah</strong> di menu Pengaturan terlebih dahulu.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
