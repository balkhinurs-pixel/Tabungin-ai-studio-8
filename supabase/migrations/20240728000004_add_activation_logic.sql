-- First, drop the existing function if it exists, to avoid conflicts.
DROP FUNCTION IF EXISTS activate_account(text, uuid);

-- Then, create the new, correct version of the function.
CREATE OR REPLACE FUNCTION activate_account(p_code text, p_user_id uuid)
RETURNS TABLE (
    success boolean,
    message text
) AS $$
DECLARE
    v_code_id int;
    v_is_used boolean;
    v_user_id_on_code uuid;
BEGIN
    -- Step 1: Find the activation code and lock the row for update
    SELECT id, is_used, used_by INTO v_code_id, v_is_used, v_user_id_on_code
    FROM public.activation_codes
    WHERE code = p_code
    FOR UPDATE;

    -- Step 2: Check if the code exists
    IF v_code_id IS NULL THEN
        RETURN QUERY SELECT false, 'invalid_code';
    END IF;

    -- Step 3: Check if the code has already been used
    IF v_is_used = true THEN
        RETURN QUERY SELECT false, 'code_already_used';
    END IF;

    -- Step 4: If we get here, the code is valid and unused.
    -- Update the user's profile to PRO
    UPDATE public.profiles
    SET plan = 'PRO'
    WHERE id = p_user_id;

    -- Step 5: Mark the activation code as used
    UPDATE public.activation_codes
    SET
        is_used = true,
        used_by = p_user_id,
        used_at = now()
    WHERE id = v_code_id;

    -- Step 6: Return success
    RETURN QUERY SELECT true, 'activation_successful';

EXCEPTION
    -- In case of any other error, rollback and return failure
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'unexpected_error';
END;
$$ LANGUAGE plpgsql;

-- Policies for activation_codes table
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activation code" ON public.activation_codes;
CREATE POLICY "Users can view their own activation code"
ON public.activation_codes FOR SELECT
USING (auth.uid() = (SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid));

DROP POLICY IF EXISTS "Admins have full access to activation codes" ON public.activation_codes;
CREATE POLICY "Admins have full access to activation codes"
ON public.activation_codes FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN')
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

-- Grant permission to authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.activate_account(text, uuid) TO authenticated;
