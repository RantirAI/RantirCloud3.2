-- Table for storing test webhook captures
CREATE TABLE webhook_test_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_project_id UUID REFERENCES flow_projects(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  body JSONB DEFAULT '{}',
  query JSONB DEFAULT '{}',
  source_ip TEXT,
  provider_detected TEXT,
  is_sample BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_webhook_test_payloads_flow ON webhook_test_payloads(flow_project_id, node_id);
CREATE INDEX idx_webhook_test_payloads_user ON webhook_test_payloads(user_id);

-- Enable RLS
ALTER TABLE webhook_test_payloads ENABLE ROW LEVEL SECURITY;

-- RLS policy for user access
CREATE POLICY "Users can manage test payloads for their flows"
  ON webhook_test_payloads FOR ALL
  USING (user_id = auth.uid());

-- Policy for edge function to insert (service role)
CREATE POLICY "Service role can insert test payloads"
  ON webhook_test_payloads FOR INSERT
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_test_payloads;