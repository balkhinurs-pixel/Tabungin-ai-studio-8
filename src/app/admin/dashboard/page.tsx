
export const dynamic = 'force-dynamic';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, Users, Key } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getStats() {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .not('email', 'like', '%.supabase.user');

    if (error) {
        console.error("Error fetching stats:", error);
        return { totalUsers: 0, proUsers: 0 };
    }

    const totalUsers = profiles.length;
    const proUsers = profiles.filter(p => p.plan === 'PRO').length;

    return { totalUsers, proUsers };
}


export default async function AdminDashboard() {
  const stats = await getStats();

  const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
  );

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Selamat datang di panel kontrol aplikasi Anda.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard 
            title="Total Pengguna"
            value={stats.totalUsers}
            icon={Users}
          />
          <StatCard 
            title="Akun Aktif (Premium)"
            value={stats.proUsers}
            icon={Key}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 0</div>
              <p className="text-xs text-muted-foreground">Fitur pendapatan belum aktif</p>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
