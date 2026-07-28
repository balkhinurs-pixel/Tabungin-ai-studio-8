
-- add_fk_to_activation_codes.sql

-- Add a foreign key constraint to the 'activation_codes' table.
-- This links the 'used_by' column to the 'id' column in the 'profiles' table.
-- This relationship is crucial for joining the tables to find out which user (by email) used which code.
-- The ON DELETE SET NULL part is a safeguard: if a user profile is deleted,
-- the 'used_by' field in the activation_codes table will be set to NULL instead of causing an error or deleting the code record.
ALTER TABLE public.activation_codes
ADD CONSTRAINT activation_codes_used_by_fkey
FOREIGN KEY (used_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
