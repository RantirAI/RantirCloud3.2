-- Update logo URLs for the 6 new integrations
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/contentful.png' WHERE integration_id = 'contentful';
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/contextual-ai.png' WHERE integration_id = 'contextual-ai';
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/contiguity.png' WHERE integration_id = 'contiguity';
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/convertkit.png' WHERE integration_id = 'convertkit';
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/copper.png' WHERE integration_id = 'copper';
UPDATE public.integrations SET icon = 'https://cdn.activepieces.com/pieces/copy-ai.png' WHERE integration_id = 'copy-ai';