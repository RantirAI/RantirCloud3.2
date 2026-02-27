-- Complete setup for rcroager@marjentech.com with proper profile and workspace
DO $$
DECLARE
    raj_user_id uuid;
    raj_workspace_id uuid;
    lite_plan_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO raj_user_id FROM auth.users WHERE email = 'rcroager@marjentech.com';
    
    -- Create profile if it doesn't exist
    INSERT INTO profiles (id, name)
    VALUES (raj_user_id, 'Raj Croager')
    ON CONFLICT (id) DO UPDATE SET name = 'Raj Croager';
    
    -- Create workspace
    INSERT INTO workspaces (user_id, name, is_default, is_enterprise)
    VALUES (raj_user_id, 'MarjenTech', true, true)
    RETURNING id INTO raj_workspace_id;
    
    -- Create or update user settings
    INSERT INTO user_settings (id, current_workspace_id)
    VALUES (raj_user_id, raj_workspace_id)
    ON CONFLICT (id) DO UPDATE SET current_workspace_id = raj_workspace_id;
    
    -- Get enterprise_lite plan ID
    SELECT id INTO lite_plan_id FROM billing_plans WHERE code = 'enterprise_lite';
    
    -- Insert workspace plan (Enterprise-Lite, $249/month from CSV)
    INSERT INTO workspace_plans (workspace_id, plan_id, seats, current_period_start, current_period_end)
    VALUES (raj_workspace_id, lite_plan_id, 1, '2024-11-19 18:58:00'::timestamp, '2024-12-09 17:00:00'::timestamp);
    
    -- Add as enterprise workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role, user_group, joined_at)
    VALUES (raj_workspace_id, raj_user_id, 'owner', 'enterprise', '2024-11-19 18:58:00'::timestamp);
    
    RAISE NOTICE 'Created complete setup for rcroager@marjentech.com';
END $$;