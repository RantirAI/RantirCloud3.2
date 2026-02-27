-- Update integration status for the 6 new integrations
UPDATE integrations 
SET is_integrated = true, 
    is_completed = true 
WHERE integration_id IN ('cal-com', 'calendly', 'call-rounded', 'camb-ai', 'campaign-monitor', 'capsule-crm');