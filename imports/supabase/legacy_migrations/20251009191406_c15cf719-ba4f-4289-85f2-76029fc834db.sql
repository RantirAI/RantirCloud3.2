-- Add INSERT policy for flow_monitoring_metrics
CREATE POLICY "Users can insert metrics for their flows"
ON flow_monitoring_metrics
FOR INSERT
WITH CHECK (
  flow_id IN (
    SELECT id FROM flow_projects WHERE user_id = auth.uid()
  )
);