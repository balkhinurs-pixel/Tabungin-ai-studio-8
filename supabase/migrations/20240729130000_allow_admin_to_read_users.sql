-- Enable Row-Level Security (RLS) if it's not already enabled
alter table public.profiles enable row level security;

-- Drop existing SELECT policy if it exists, to avoid conflicts
drop policy if exists "Allow admins to view all user profiles" on public.profiles;

-- Create a new policy that allows ADMINs to read all profiles
create policy "Allow admins to view all user profiles"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
);

-- Note: The existing policy "Users can view their own profile" should already be in place.
-- If not, it would look like this:
-- create policy "Users can view their own profile"
-- on public.profiles for select
-- using (auth.uid() = id);
