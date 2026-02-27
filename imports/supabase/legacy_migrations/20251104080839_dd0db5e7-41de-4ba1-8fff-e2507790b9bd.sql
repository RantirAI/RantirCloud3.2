-- Set node_type for the 7 new node integrations
UPDATE integrations 
SET node_type = integration_id
WHERE integration_id IN ('bettermode', 'bika', 'binance', 'bitly', 'blockscout', 'bluesky', 'bonjoro');