import { NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

// This endpoint is used to create activity on the Supabase project
// to prevent it from being paused on the free tier.
export async function GET() {
  const supabase = createClient();
  
  try {
    // Perform a lightweight query to generate database activity.
    // Selecting a single row from the 'profiles' table is very efficient.
    const { error, count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      // If there's an error, log it and return a server error status
      console.error('Supabase ping error:', error.message);
      return NextResponse.json(
        { message: 'Error pinging Supabase', error: error.message },
        { status: 500 }
      );
    }

    // If the query is successful, return a success message.
    return NextResponse.json(
      { message: 'Supabase instance is active.', timestamp: new Date().toISOString(), user_count: count },
      { status: 200 }
    );

  } catch (e: any) {
    // Catch any other unexpected errors
    console.error('Unexpected error in /api/ping:', e.message);
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: e.message },
      { status: 500 }
    );
  }
}
