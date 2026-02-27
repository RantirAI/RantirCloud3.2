-- Add INSERT policy for flow_monitoring_logs so owners can write logs
CREATE POLICY "Users can insert logs for their flows"
ON public.flow_monitoring_logs
FOR INSERT
WITH CHECK (
  flow_id IN (
    SELECT id FROM public.flow_projects WHERE user_id = auth.uid()
  )
);