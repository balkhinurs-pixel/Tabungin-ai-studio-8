
-- add_wa_number_to_students.sql
alter table "public"."students" add column "whatsapp_number" text;

-- add_role_to_profiles.sql
alter table "public"."profiles" add column "role" text not null default 'USER'::text;

-- Update RLS policy for profiles to allow users to read their own role
drop policy if exists "Public profiles are viewable by everyone." on "public"."profiles";
create policy "Public profiles are viewable by everyone."
on "public"."profiles"
as permissive
for select
to public
using (true);

drop policy if exists "Users can insert their own profile." on "public"."profiles";
create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));

drop policy if exists "Users can update own profile." on "public"."profiles";
create policy "Users can update own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


-- Recreate the activate_account function to align with new schema policies if needed
CREATE OR REPLACE FUNCTION public.activate_account(p_code text, p_user_id uuid)
 RETURNS record
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  code_id int;
  updated_profile record;
BEGIN
  -- Find the code and lock the row
  SELECT id INTO code_id FROM activation_codes WHERE code = p_code AND is_used = false FOR UPDATE;

  -- If code is not found or already used, raise an exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activation code is invalid or has already been used.';
  END IF;

  -- Mark the code as used
  UPDATE activation_codes
  SET 
    is_used = true,
    used_by = p_user_id,
    used_at = now()
  WHERE id = code_id;

  -- Upgrade the user's plan to PRO
  UPDATE profiles
  SET plan = 'PRO'
  WHERE id = p_user_id
  RETURNING * INTO updated_profile;
  
  -- Return the updated profile
  RETURN updated_profile;
END;
$function$;
