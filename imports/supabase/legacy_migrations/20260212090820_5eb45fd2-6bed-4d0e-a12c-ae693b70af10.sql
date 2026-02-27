
-- Update Datadog to be installable
UPDATE integrations 
SET is_enabled = true, 
    requires_installation = true, 
    node_type = 'datadog',
    provider = 'datadog',
    updated_at = now()
WHERE integration_id = 'datadog';

-- Insert Data Summarizer
INSERT INTO integrations (integration_id, name, description, category, provider, icon, is_enabled, requires_installation, node_type, is_completed, version, "LongDescription")
VALUES (
  'data-summarizer',
  'Data Summarizer',
  'Summarize, aggregate, and analyze datasets with statistical operations including basic stats, group-by, top-N, frequency counts, and text summaries.',
  'analytics',
  'rantir',
  'https://cdn-icons-png.flaticon.com/512/2920/2920349.png',
  true,
  true,
  'data-summarizer',
  false,
  '1.0.0',
  '<p>Integrate Data Summarizer into your flows to perform powerful data analysis operations. Supports basic statistics (count, sum, avg, min, max), group-by aggregation, top-N record filtering, frequency counting, and human-readable text summaries of your datasets.</p>'
)
ON CONFLICT DO NOTHING;

-- Insert ElevenLabs
INSERT INTO integrations (integration_id, name, description, category, provider, icon, is_enabled, requires_installation, node_type, is_completed, version, "LongDescription")
VALUES (
  'elevenlabs',
  'ElevenLabs',
  'AI voice generation platform for text-to-speech, sound effects, and speech-to-text capabilities.',
  'ai',
  'elevenlabs',
  'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05cba74fe0b2d0032be92_elevenlabs.png',
  true,
  true,
  'elevenlabs',
  false,
  '1.0.0',
  '<p>Integrate ElevenLabs into your workflows for AI-powered voice generation. Convert text to natural-sounding speech, generate sound effects from descriptions, and transcribe audio files with Speech-to-Text. Supports multiple voices, languages, and audio formats.</p>'
)
ON CONFLICT DO NOTHING;
