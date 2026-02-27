-- Remove the overly broad public SELECT policy on published_apps
-- This policy exposes analytics data (views, unique_visitors), custom domains, and metadata to unauthenticated users
-- The render-published-app edge function uses service_role key and bypasses RLS
-- Authenticated users access their own apps via the "Users can manage their own published apps" policy
DROP POLICY IF EXISTS "Published apps are publicly viewable" ON public.published_apps;