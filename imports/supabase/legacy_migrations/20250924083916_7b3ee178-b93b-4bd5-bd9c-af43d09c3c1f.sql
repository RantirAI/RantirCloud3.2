-- Reset password for gidget@typeiii.tech to default password
-- Using Supabase's auth.users table update
UPDATE auth.users 
SET 
  encrypted_password = crypt('rantir2025', gen_salt('bf')),
  email_confirmed_at = CASE 
    WHEN email_confirmed_at IS NULL THEN now() 
    ELSE email_confirmed_at 
  END,
  updated_at = now()
WHERE email = 'gidget@typeiii.tech';