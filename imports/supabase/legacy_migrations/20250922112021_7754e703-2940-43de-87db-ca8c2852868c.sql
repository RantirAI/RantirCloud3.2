-- Update integration status to true for the 7 new nodes
UPDATE integrations 
SET is_integrated = true
WHERE node_type IN ('aminos', 'anyhook-graphql', 'apify', 'apitable', 'apitemplate-io', 'approval', 'ashby');