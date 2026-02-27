UPDATE integrations 
SET is_enabled = true, 
    is_completed = true, 
    node_type = 'customer-io',
    category = 'Automation',
    icon = 'https://cdn.activepieces.com/pieces/customer-io.png',
    updated_at = now()
WHERE integration_id = 'customer-io';