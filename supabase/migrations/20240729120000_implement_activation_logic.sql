
-- 1. Create the database function to handle account activation atomically.
create or replace function public.activate_account (p_code text, p_user_id uuid)
returns table (
  id uuid,
  email text,
  plan text,
  role text
) as $$
declare
  v_code_id int;
begin
  -- Find the code and lock the row for update
  select ac.id into v_code_id from public.activation_codes ac
  where ac.code = p_code and ac.is_used = false
  for update;

  -- If the code is not found or is already used, raise an exception
  if not found then
    raise exception 'invalid_or_used_code';
  end if;

  -- Update the profiles table
  update public.profiles
  set plan = 'PRO'
  where public.profiles.id = p_user_id;

  -- Update the activation_codes table
  update public.activation_codes
  set
    is_used = true,
    used_by = p_user_id,
    used_at = now()
  where public.activation_codes.id = v_code_id;
  
  -- Return the updated profile
  return query select pf.id, pf.email, pf.plan, pf.role from public.profiles pf where pf.id = p_user_id;
end;
$$ language plpgsql volatile security definer;

-- 2. Add RLS policies to allow users to use activation codes.

-- Allow logged-in users to read activation codes they are trying to use.
-- This is necessary for the initial check in the UI.
create policy "Allow authenticated users to read codes"
on public.activation_codes
for select
to authenticated
using (true);

-- Allow authenticated users to call the activate_account function.
-- The function itself contains the security logic.
grant execute on function public.activate_account(text, uuid) to authenticated;
