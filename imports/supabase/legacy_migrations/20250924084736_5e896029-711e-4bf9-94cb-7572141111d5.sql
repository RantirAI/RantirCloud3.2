-- Comprehensive data correction based on CSV file
-- Fix all user data including workspace names, billing plans, and enterprise status

-- First, let's update Gidget's workspace and plan correctly
UPDATE workspaces 
SET name = 'TypeIII', is_enterprise = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'gidget@typeiii.tech');

-- Get the enterprise_lite plan ID
DO $$
DECLARE
    gidget_user_id uuid;
    gidget_workspace_id uuid;
    lite_plan_id uuid;
    starter_plan_id uuid;
    amber_user_id uuid;
    amber_workspace_id uuid;
BEGIN
    -- Get user IDs
    SELECT id INTO gidget_user_id FROM auth.users WHERE email = 'gidget@typeiii.tech';
    SELECT id INTO amber_user_id FROM auth.users WHERE email = 'amber_kate@hotmail.com';
    
    -- Get workspace IDs
    SELECT current_workspace_id INTO gidget_workspace_id FROM user_settings WHERE id = gidget_user_id;
    SELECT current_workspace_id INTO amber_workspace_id FROM user_settings WHERE id = amber_user_id;
    
    -- Get plan IDs
    SELECT id INTO lite_plan_id FROM billing_plans WHERE code = 'enterprise_lite';
    SELECT id INTO starter_plan_id FROM billing_plans WHERE code = 'enterprise_starter';
    
    -- Insert or update Gidget's workspace plan (Enterprise-Lite, $299/month)
    INSERT INTO workspace_plans (workspace_id, plan_id, seats, current_period_start, current_period_end)
    VALUES (gidget_workspace_id, lite_plan_id, 1, '2025-07-24 17:31:00'::timestamp, '2025-08-24 18:32:00'::timestamp)
    ON CONFLICT (workspace_id) 
    DO UPDATE SET 
        plan_id = lite_plan_id,
        seats = 1,
        current_period_start = '2025-07-24 17:31:00'::timestamp,
        current_period_end = '2025-08-24 18:32:00'::timestamp,
        updated_at = now();
    
    -- Add Gidget as enterprise workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role, user_group, joined_at)
    VALUES (gidget_workspace_id, gidget_user_id, 'owner', 'enterprise', '2025-07-24 17:31:00'::timestamp)
    ON CONFLICT (workspace_id, user_id) 
    DO UPDATE SET 
        role = 'owner', 
        user_group = 'enterprise',
        joined_at = '2025-07-24 17:31:00'::timestamp;
    
    -- Fix Amber's plan to Enterprise-Starter ($599/month) as per CSV
    UPDATE workspace_plans 
    SET 
        plan_id = starter_plan_id,
        current_period_start = '2025-07-10 04:08:00'::timestamp,
        current_period_end = '2025-09-10 05:10:00'::timestamp,
        updated_at = now()
    WHERE workspace_id = amber_workspace_id;
    
    -- Update Amber's workspace member group to enterprise
    UPDATE workspace_members 
    SET user_group = 'enterprise'
    WHERE workspace_id = amber_workspace_id AND user_id = amber_user_id;
    
END $$;