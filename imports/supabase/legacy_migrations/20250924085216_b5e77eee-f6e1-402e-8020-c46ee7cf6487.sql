-- Reset password for rcroager@marjentech.com and ensure all CSV data is correct
UPDATE auth.users 
SET 
  encrypted_password = crypt('rantir2025', gen_salt('bf')),
  email_confirmed_at = CASE 
    WHEN email_confirmed_at IS NULL THEN now() 
    ELSE email_confirmed_at 
  END,
  updated_at = now()
WHERE email = 'rcroager@marjentech.com';

-- Update Raj Croager's data to match CSV
DO $$
DECLARE
    raj_user_id uuid;
    raj_workspace_id uuid;
    lite_plan_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO raj_user_id FROM auth.users WHERE email = 'rcroager@marjentech.com';
    
    -- If user doesn't exist, skip
    IF raj_user_id IS NULL THEN
        RAISE NOTICE 'User rcroager@marjentech.com not found';
        RETURN;
    END IF;
    
    -- Get workspace ID
    SELECT current_workspace_id INTO raj_workspace_id FROM user_settings WHERE id = raj_user_id;
    
    -- Update workspace name and enterprise status
    UPDATE workspaces 
    SET name = 'MarjenTech', is_enterprise = true
    WHERE id = raj_workspace_id;
    
    -- Get enterprise_lite plan ID
    SELECT id INTO lite_plan_id FROM billing_plans WHERE code = 'enterprise_lite';
    
    -- Insert or update workspace plan (Enterprise-Lite, $249/month from CSV)
    INSERT INTO workspace_plans (workspace_id, plan_id, seats, current_period_start, current_period_end)
    VALUES (raj_workspace_id, lite_plan_id, 1, '2024-11-19 18:58:00'::timestamp, '2024-12-09 17:00:00'::timestamp)
    ON CONFLICT (workspace_id) 
    DO UPDATE SET 
        plan_id = lite_plan_id,
        seats = 1,
        current_period_start = '2024-11-19 18:58:00'::timestamp,
        current_period_end = '2024-12-09 17:00:00'::timestamp,
        updated_at = now();
    
    -- Add as enterprise workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role, user_group, joined_at)
    VALUES (raj_workspace_id, raj_user_id, 'owner', 'enterprise', '2024-11-19 18:58:00'::timestamp)
    ON CONFLICT (workspace_id, user_id) 
    DO UPDATE SET 
        role = 'owner', 
        user_group = 'enterprise',
        joined_at = '2024-11-19 18:58:00'::timestamp;
    
    RAISE NOTICE 'Updated data for rcroager@marjentech.com successfully';
END $$;