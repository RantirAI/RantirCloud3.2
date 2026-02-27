-- Enable the 7 new node integrations and fix Bitly provider
UPDATE integrations 
SET is_enabled = true
WHERE integration_id IN ('bettermode', 'bika', 'binance', 'bitly', 'blockscout', 'bluesky', 'bonjoro');

-- Fix Bitly provider to match others
UPDATE integrations 
SET provider = 'rantir'
WHERE integration_id = 'bitly';