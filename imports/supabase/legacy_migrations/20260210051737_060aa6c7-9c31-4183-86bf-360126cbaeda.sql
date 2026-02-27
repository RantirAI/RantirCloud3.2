-- Remove the plaintext api_key column from flow_node_configurations
-- This column is unused (0 rows have values) and poses a security risk
-- API keys should be stored in the Vault-based flow_secrets system instead
ALTER TABLE public.flow_node_configurations DROP COLUMN IF EXISTS api_key;