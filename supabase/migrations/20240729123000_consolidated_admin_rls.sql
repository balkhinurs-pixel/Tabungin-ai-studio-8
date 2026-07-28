
-- Function to get user role from JWT claims
create or replace function public.get_user_role_from_claim()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', '')::text;
$$;

-- Function and Trigger to add custom claims on login
create or replace function public.handle_new_user_claims()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Add the user's role from the profiles table to the JWT
  update auth.users set raw_app_meta_data = 
    raw_app_meta_data || 
    json_build_object('role', (select role from public.profiles where id = new.id))::jsonb
  where id = new.id;
  return new;
end;
$$;

-- trigger the function whenever a user is created
create trigger on_new_user_claims
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_claims();


-- Add 'role' column to 'profiles' if it doesn't exist
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'role'
    ) then
        alter table public.profiles add column role text default 'USER';
    end if;
end$$;


-- Enable RLS on all relevant tables
alter table public.profiles enable row level security;
alter table public.activation_codes enable row level security;
alter table public.students enable row level security;
alter table public.transactions enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Admins can view all profiles." on public.profiles;
drop policy if exists "Allow full access for admins" on public.activation_codes;
drop policy if exists "Enable read access for all users" on public.activation_codes;
drop policy if exists "Users can insert their own students" on public.students;
drop policy if exists "Users can view their own students" on public.students;
drop policy if exists "Users can update their own students" on public.students;
drop policy if exists "Users can delete their own students" on public.students;
drop policy if exists "Users can manage transactions for their students" on public.transactions;


-- PROFILES POLICIES
create policy "Users can view their own profile." on public.profiles
for select using (auth.uid() = id);

create policy "Admins can view all profiles." on public.profiles
for select using (public.get_user_role_from_claim() = 'ADMIN');

-- ACTIVATION CODES POLICIES
create policy "Allow full access for admins" on public.activation_codes
for all using (public.get_user_role_from_claim() = 'ADMIN');

create policy "Enable read access for authenticated users" on public.activation_codes
for select using (auth.role() = 'authenticated');

-- STUDENTS POLICIES
create policy "Users can manage their own students" on public.students
for all using (auth.uid() = user_id);

-- TRANSACTIONS POLICIES
create policy "Users can manage transactions for their students" on public.transactions
for all using ((
  select user_id from public.students where id = transactions.student_id
) = auth.uid());
