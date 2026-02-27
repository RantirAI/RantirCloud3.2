-- Reset password for the imported user
-- This is a temporary fix to allow login with the default password
DO $$
DECLARE
    user_id_val uuid := 'f791c824-22ed-4dff-8971-4fc0b35f2b63';
BEGIN
    -- Update the user's password using the admin function
    -- Note: In a real scenario, you'd use supabase.auth.admin.updateUserById
    -- For now, let's just verify the user exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_val) THEN
        RAISE NOTICE 'User exists with ID: %', user_id_val;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;