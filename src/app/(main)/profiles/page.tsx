
import type { Student, Profile } from '@/types';
import { addStudentAction, updateStudentAction, deleteStudentAction, importStudentsAction, archiveStudentAction, restoreStudentAction, resetStudentPinAction } from './actions';
import ProfilesClientPage from './ProfilesClientPage';
import type { AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// This is now a pure Server Component
export default async function ProfilesPage() {
    const supabase = createClient();

    // Fetch initial data on the server
    const { data: { user } } = await supabase.auth.getUser();
    
    const [
        { data: studentsData, error: studentsError },
        { data: profileData, error: profileError }
    ] = await Promise.all([
        user ? supabase.from('students').select('*').eq('user_id', user.id).order('name', { ascending: true }) : Promise.resolve({ data: [], error: null }),
        user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null, error: null })
    ]);

    if (studentsError) {
        console.error("Error fetching students data for ProfilesPage:", studentsError);
    }
    if (profileError) {
        // This is not a fatal error, user might not have a profile yet if they just signed up
        console.warn("Could not fetch profile for ProfilesPage:", profileError.message);
    }

    let initialStudents = (studentsData as Student[]) || [];
    // Sinkronisasi PIN aktif siswa: jika kolom pin di tabel database belum ada atau masih kosong,
    // ambil nilai dari user_metadata akun auth siswa agar tabel selalu menampilkan PIN yang sesuai
    if (initialStudents.some(s => !s.pin)) {
        try {
            const supabaseAdmin = getSupabaseAdmin();
            const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            if (authUsers && authUsers.length > 0) {
                const pinMap = new Map<string, string>();
                (authUsers as any[]).forEach((u: any) => {
                    if (u.user_metadata?.pin) {
                        pinMap.set(u.id, String(u.user_metadata.pin));
                    }
                });
                initialStudents = initialStudents.map(s => ({
                    ...s,
                    pin: s.pin || pinMap.get(s.id) || '123456'
                }));
            }
        } catch (pinSyncErr) {
            console.warn('[PROFILES_AUTH_PIN_SYNC_WARN]', pinSyncErr);
        }
    }

    return (
        <ProfilesClientPage
            initialStudents={initialStudents}
            initialProfile={profileData as Profile | null}
            initialUser={user}
            addStudentAction={addStudentAction}
            updateStudentAction={updateStudentAction}
            deleteStudentAction={deleteStudentAction}
            importStudentsAction={importStudentsAction}
            archiveStudentAction={archiveStudentAction}
            restoreStudentAction={restoreStudentAction}
            resetStudentPinAction={resetStudentPinAction}
        />
    );
}
