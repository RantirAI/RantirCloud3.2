-- Create cloud_projects table
CREATE TABLE cloud_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cloud_projects_user_id ON cloud_projects(user_id);

-- Enable RLS
ALTER TABLE cloud_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cloud_projects
CREATE POLICY "Users can manage their own cloud projects"
  ON cloud_projects
  FOR ALL
  USING (auth.uid() = user_id);

-- Create cloud_terminals table
CREATE TABLE cloud_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloud_project_id UUID NOT NULL REFERENCES cloud_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cloud_terminals_project_id ON cloud_terminals(cloud_project_id);
CREATE INDEX idx_cloud_terminals_user_id ON cloud_terminals(user_id);

-- Enable RLS
ALTER TABLE cloud_terminals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cloud_terminals
CREATE POLICY "Users can manage terminals for their cloud projects"
  ON cloud_terminals
  FOR ALL
  USING (user_id = auth.uid());

-- Trigger for updated_at on cloud_projects
CREATE TRIGGER update_cloud_projects_updated_at
  BEFORE UPDATE ON cloud_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on cloud_terminals
CREATE TRIGGER update_cloud_terminals_updated_at
  BEFORE UPDATE ON cloud_terminals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();