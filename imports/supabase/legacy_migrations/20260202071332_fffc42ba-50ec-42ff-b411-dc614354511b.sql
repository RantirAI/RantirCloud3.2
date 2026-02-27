-- Update existing integrations with node_type
UPDATE integrations SET node_type = 'crisp', is_completed = true WHERE integration_id = 'crisp';
UPDATE integrations SET node_type = 'cryptolens', is_completed = true WHERE integration_id = 'cryptolens';

-- Insert new integrations
INSERT INTO integrations (integration_id, name, description, category, icon, provider, node_type, is_enabled, is_completed, priority)
VALUES 
('couchbase', 'Couchbase', 'NoSQL document database with N1QL query support, document CRUD operations, and cluster management', 'Development', 'Database', 'couchbase', 'couchbase', true, true, 50),
('crypto', 'Crypto', 'Cryptographic operations including hashing (SHA/MD5), HMAC signing, and AES encryption/decryption', 'Development', 'Shield', 'internal', 'crypto', true, true, 50),
('csv', 'CSV', 'CSV data processing for parsing, generation, filtering, merging, and sorting operations', 'Development', 'FileSpreadsheet', 'internal', 'csv', true, true, 50),
('cursor', 'Cursor', 'AI-powered code assistant for generation, refactoring, explanation, and review using OpenAI-compatible endpoints', 'LLMs / Gen AI', 'Bot', 'cursor', 'cursor', true, true, 50)