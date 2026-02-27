
-- Create flows table for widget access control
CREATE TABLE public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_project_id UUID NOT NULL REFERENCES flow_projects(id) ON DELETE CASCADE,
  org_id UUID,
  agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  allowed_domains TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_flows_flow_project_id ON public.flows(flow_project_id);
CREATE INDEX idx_flows_status ON public.flows(status);

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- RLS policies: workspace members can manage flows via their flow_projects
CREATE POLICY "Workspace members can view flows"
  ON public.flows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flow_projects fp
      WHERE fp.id = flows.flow_project_id
      AND public.is_workspace_member(fp.workspace_id)
    )
  );

CREATE POLICY "Workspace members can insert flows"
  ON public.flows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flow_projects fp
      WHERE fp.id = flows.flow_project_id
      AND public.is_workspace_member(fp.workspace_id)
    )
  );

CREATE POLICY "Workspace members can update flows"
  ON public.flows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM flow_projects fp
      WHERE fp.id = flows.flow_project_id
      AND public.is_workspace_member(fp.workspace_id)
    )
  );

CREATE POLICY "Workspace members can delete flows"
  ON public.flows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM flow_projects fp
      WHERE fp.id = flows.flow_project_id
      AND public.is_workspace_member(fp.workspace_id)
    )
  );

-- Auto-populate: create a flow row for each existing flow_project
INSERT INTO public.flows (flow_project_id)
SELECT id FROM public.flow_projects;
