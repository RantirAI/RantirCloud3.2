-- Update logo URLs for integrations with ActivePieces CDN URLs
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/box.png' WHERE node_type = 'box';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/brilliant-directories.png' WHERE node_type = 'brilliant-directories';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/browse-ai.png' WHERE node_type = 'browse-ai';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/browserless.png' WHERE node_type = 'browserless';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/bubble.png' WHERE node_type = 'bubble';
UPDATE integrations SET icon = 'https://cdn.activepieces.com/pieces/bumpups.png' WHERE node_type = 'bumpups';