-- Drop the constraint if it exists to handle re-running the migration
ALTER TABLE public.activation_codes
DROP CONSTRAINT IF EXISTS activation_codes_used_by_fkey;

-- Add the foreign key constraint to link activation codes to the user who used them.
-- ON DELETE SET NULL means if the user's profile is deleted, the 'used_by' field will become NULL
-- instead of deleting the activation code record. This helps maintain historical data.
ALTER TABLE public.activation_codes
ADD CONSTRAINT activation_codes_used_by_fkey
FOREIGN KEY (used_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
