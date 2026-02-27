-- Add missing stripe_customer_id column to workspace_plans table
ALTER TABLE public.workspace_plans 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;