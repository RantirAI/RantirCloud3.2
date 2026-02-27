-- Update integration status for the 7 new nodes
UPDATE integrations 
SET is_completed = true, is_integrated = true 
WHERE integration_id IN ('bettermode', 'bika', 'binance', 'bitly', 'blockscout', 'bluesky', 'bonjoro');