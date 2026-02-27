-- Update icon URLs for the 6 integrations
UPDATE integrations 
SET icon = CASE integration_id
  WHEN 'cal-com' THEN 'https://cdn.activepieces.com/pieces/cal.com.png'
  WHEN 'calendly' THEN 'https://cdn.activepieces.com/pieces/calendly.png'
  WHEN 'call-rounded' THEN 'https://cdn.activepieces.com/pieces/call-rounded.png'
  WHEN 'camb-ai' THEN 'https://cdn.activepieces.com/pieces/camb-ai.png'
  WHEN 'campaign-monitor' THEN 'https://cdn.activepieces.com/pieces/campaign-monitor.png'
  WHEN 'capsule-crm' THEN 'https://cdn.activepieces.com/pieces/capsule-crm.png'
END
WHERE integration_id IN ('cal-com', 'calendly', 'call-rounded', 'camb-ai', 'campaign-monitor', 'capsule-crm');