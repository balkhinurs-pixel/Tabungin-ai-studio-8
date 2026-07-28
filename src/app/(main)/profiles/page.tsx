
import type { Student, Profile } from '@/types';
import { addStudentAction, updateStudentAction, deleteStudentAction, importStudentsAction } from './actions';
import ProfilesClientPage from './ProfilesClientPage';
import type { AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/utils/supabase/server';

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

    return (
        <ProfilesClientPage
            initialStudents={studentsData as Student[] || []}
            initialProfile={profileData as Profile | null}
            initialUser={user}
            addStudentAction={addStudentAction}
            updateStudentAction={updateStudentAction}
            deleteStudentAction={deleteStudentAction}
            importStudentsAction={importStudentsAction}
        />
    );
}
