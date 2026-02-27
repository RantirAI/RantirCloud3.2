import { NodePlugin } from '@/types/node-plugin';

export const elevenlabsNode: NodePlugin = {
  type: 'elevenlabs',
  name: 'ElevenLabs',
  description: 'AI voice generation and text-to-speech with custom API calls',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/elevenlabs.png',
  color: '#000000',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your ElevenLabs API key',
      description: 'Your ElevenLabs API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Text to Speech', value: 'textToSpeech', description: 'Convert text into lifelike speech' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall', description: 'Make a custom ElevenLabs API request' },
      ],
      description: 'Select the ElevenLabs action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'textToSpeech') {
      inputs.push(
        { name: 'text', label: 'Text', type: 'textarea', required: true, placeholder: 'Enter text to convert to speech' },
        { name: 'voiceId', label: 'Voice ID', type: 'text', required: true, placeholder: 'JBFqnCBsd6RMkjVDRZzb (George)', description: 'ElevenLabs voice ID' },
        { name: 'modelId', label: 'Model', type: 'select', required: true, default: 'eleven_multilingual_v2', options: [
          { label: 'Multilingual v2 (Best quality)', value: 'eleven_multilingual_v2' },
          { label: 'Turbo v2.5 (Low latency)', value: 'eleven_turbo_v2_5' },
          { label: 'Turbo v2 (Fastest)', value: 'eleven_turbo_v2' },
          { label: 'Monolingual v1 (English only)', value: 'eleven_monolingual_v1' },
        ]},
        { name: 'stability', label: 'Stability (0-1)', type: 'text', required: false, placeholder: '0.5' },
        { name: 'similarityBoost', label: 'Similarity Boost (0-1)', type: 'text', required: false, placeholder: '0.75' },
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/v1/voices' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{"text": "Hello"}' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from ElevenLabs API' },
    { name: 'audioBase64', type: 'string', description: 'Base64 encoded audio (for TTS)' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('elevenlabs-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        audioBase64: data?.audioBase64 || '',
      };
    } catch (error) {
      throw new Error(`ElevenLabs API error: ${error.message}`);
    }
  },
};
