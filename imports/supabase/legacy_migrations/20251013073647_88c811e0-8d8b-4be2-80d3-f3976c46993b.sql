-- Update Memberstack logo URL in integrations table
UPDATE integrations 
SET icon = 'https://cdn.prod.website-files.com/5be2fa35a6796462795d8502/5c7474e89b5a57b01bc6b3be_Logo%40250.png'
WHERE integration_id = 'memberstack';