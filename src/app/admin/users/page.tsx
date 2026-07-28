
export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { Profile } from '@/types';
import UserListClient from './UserListClient';

async function getUsers() {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .not('email', 'like', '%.supabase.user')
        .order('email', { ascending: true });

    if (error) {
        console.error("Error fetching profiles:", error);
        return [];
    }
    return data as Profile[];
}

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
              <p className="text-muted-foreground">Kelola hak akses, plan premium, dan kuota siswa untuk semua guru.</p>
            </div>

            <UserListClient initialUsers={users} />
        </div>
    );
}
