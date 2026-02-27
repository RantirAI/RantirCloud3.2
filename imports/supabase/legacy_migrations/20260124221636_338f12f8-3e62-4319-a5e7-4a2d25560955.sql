-- Add MCP (Model Context Protocol) configuration columns to flow_projects
ALTER TABLE public.flow_projects 
ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mcp_tool_name TEXT,
ADD COLUMN IF NOT EXISTS mcp_tool_description TEXT;

-- Add index for faster MCP tool discovery
CREATE INDEX IF NOT EXISTS idx_flow_projects_mcp_enabled 
ON public.flow_projects(mcp_enabled) 
WHERE mcp_enabled = true AND is_deployed = true;

-- Add comment for documentation
COMMENT ON COLUMN public.flow_projects.mcp_enabled IS 'Whether this flow is exposed as an MCP tool';
COMMENT ON COLUMN public.flow_projects.mcp_tool_name IS 'Custom tool name for MCP (defaults to endpoint_slug)';
COMMENT ON COLUMN public.flow_projects.mcp_tool_description IS 'Description shown to AI agents discovering this tool';