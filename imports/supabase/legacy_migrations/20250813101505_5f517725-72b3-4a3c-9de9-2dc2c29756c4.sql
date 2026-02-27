-- Phase 1: Database Schema Enhancement for Node Integrations

-- Add new columns to integrations table to support node-based integrations
ALTER TABLE integrations 
ADD COLUMN requires_installation boolean NOT NULL DEFAULT false,
ADD COLUMN node_type text,
ADD COLUMN installation_config jsonb DEFAULT '{}'::jsonb;

-- Update existing webflow integration to require installation
UPDATE integrations 
SET requires_installation = true, 
    node_type = 'webflow',
    installation_config = '{"apiKeyRequired": true, "description": "Connect your Webflow account to create and manage Webflow sites, collections, and items directly from your flows."}'::jsonb
WHERE integration_id = 'webflow';

-- Insert node-based integrations for other nodes that don't require installation
INSERT INTO integrations (integration_id, name, description, category, provider, requires_installation, node_type, installation_config) VALUES 
('ai-agent', 'AI Agent', 'Intelligent agent for processing and responding to user inputs with AI capabilities', 'LLMs / Gen AI', 'built-in', false, 'ai-agent', '{}'),
('http-request', 'HTTP Request', 'Make HTTP requests to external APIs and services', 'Development', 'built-in', false, 'http-request', '{}'),
('calculator', 'Calculator', 'Perform mathematical calculations and operations', 'Productivity', 'built-in', false, 'calculator', '{}'),
('data-filter', 'Data Filter', 'Filter and transform data using custom conditions', 'Productivity', 'built-in', false, 'data-filter', '{}'),
('condition', 'Condition', 'Create conditional logic and branching in your flows', 'Development', 'built-in', false, 'condition', '{}'),
('data-table', 'Data Table', 'Work with tabular data and perform table operations', 'Productivity', 'built-in', false, 'data-table', '{}'),
('ai-mapper', 'AI Mapper', 'Intelligently map and transform data structures using AI', 'LLMs / Gen AI', 'built-in', false, 'ai-mapper', '{}')
ON CONFLICT (integration_id) DO UPDATE SET
requires_installation = EXCLUDED.requires_installation,
node_type = EXCLUDED.node_type,
installation_config = EXCLUDED.installation_config;

-- Create index for better performance when querying by node_type
CREATE INDEX IF NOT EXISTS idx_integrations_node_type ON integrations(node_type);
CREATE INDEX IF NOT EXISTS idx_integrations_requires_installation ON integrations(requires_installation);