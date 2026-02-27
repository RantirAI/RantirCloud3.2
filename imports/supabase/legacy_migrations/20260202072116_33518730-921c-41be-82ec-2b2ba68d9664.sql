-- Update requires_installation to true for the new nodes
UPDATE integrations SET requires_installation = true WHERE integration_id IN ('couchbase', 'crypto', 'csv', 'cursor', 'crisp', 'cryptolens');