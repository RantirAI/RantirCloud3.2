-- Enable realtime for workspaces table
ALTER TABLE workspaces REPLICA IDENTITY FULL;

-- Add workspaces table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;