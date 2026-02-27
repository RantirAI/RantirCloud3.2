import { NodePlugin } from '@/types/node-plugin';

export const deepgramNode: NodePlugin = {
  type: 'deepgram',
  name: 'Deepgram',
  description: 'AI-powered speech-to-text, text-to-speech, and audio intelligence',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/deepgram.png',
  color: '#13EF93',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your Deepgram API key',
      description: 'Your Deepgram API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Summary', value: 'createSummary', description: 'Get AI summary of audio content' },
        { label: 'Create Transcription (Callback)', value: 'createTranscriptionCallback', description: 'Transcribe audio with a callback URL for results' },
        { label: 'List Projects', value: 'listProjects', description: 'List all projects in your Deepgram account' },
        { label: 'Text to Speech', value: 'textToSpeech', description: 'Convert text to speech audio' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall', description: 'Make a custom Deepgram API request' },
      ],
      description: 'Select the Deepgram action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'createSummary') {
      inputs.push(
        { name: 'audioUrl', label: 'Audio URL', type: 'text', required: true, placeholder: 'https://example.com/audio.mp3', description: 'URL of the audio file to summarize' },
        { name: 'language', label: 'Language', type: 'select', required: false, default: 'en', options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'German', value: 'de' },
          { label: 'Auto Detect', value: '' },
        ]},
        { name: 'model', label: 'Model', type: 'select', required: false, default: 'nova-2', options: [
          { label: 'Nova-2 (Best)', value: 'nova-2' },
          { label: 'Nova', value: 'nova' },
          { label: 'Base', value: 'base' },
        ]},
      );
    } else if (action === 'createTranscriptionCallback') {
      inputs.push(
        { name: 'audioUrl', label: 'Audio URL', type: 'text', required: true, placeholder: 'https://example.com/audio.mp3', description: 'URL of the audio file to transcribe' },
        { name: 'callbackUrl', label: 'Callback URL', type: 'text', required: true, placeholder: 'https://your-server.com/webhook', description: 'URL to receive transcription results' },
        { name: 'language', label: 'Language', type: 'select', required: false, default: 'en', options: [
          { label: 'English', value: 'en' },
          { label: 'Spanish', value: 'es' },
          { label: 'French', value: 'fr' },
          { label: 'Auto Detect', value: '' },
        ]},
        { name: 'model', label: 'Model', type: 'select', required: false, default: 'nova-2', options: [
          { label: 'Nova-2 (Best)', value: 'nova-2' },
          { label: 'Nova', value: 'nova' },
          { label: 'Base', value: 'base' },
        ]},
        { name: 'punctuate', label: 'Add Punctuation', type: 'select', required: false, default: 'true', options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ]},
        { name: 'diarize', label: 'Speaker Diarization', type: 'select', required: false, default: 'false', options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ]},
      );
    } else if (action === 'listProjects') {
      // No additional inputs needed
    } else if (action === 'textToSpeech') {
      inputs.push(
        { name: 'text', label: 'Text', type: 'textarea', required: true, placeholder: 'Hello, this is a test.', description: 'Text to convert to speech' },
        { name: 'voice', label: 'Voice', type: 'select', required: false, default: 'aura-asteria-en', options: [
          { label: 'Asteria (Female)', value: 'aura-asteria-en' },
          { label: 'Luna (Female)', value: 'aura-luna-en' },
          { label: 'Stella (Female)', value: 'aura-stella-en' },
          { label: 'Athena (Female)', value: 'aura-athena-en' },
          { label: 'Hera (Female)', value: 'aura-hera-en' },
          { label: 'Orion (Male)', value: 'aura-orion-en' },
          { label: 'Arcas (Male)', value: 'aura-arcas-en' },
          { label: 'Perseus (Male)', value: 'aura-perseus-en' },
          { label: 'Angus (Male)', value: 'aura-angus-en' },
          { label: 'Orpheus (Male)', value: 'aura-orpheus-en' },
          { label: 'Helios (Male)', value: 'aura-helios-en' },
          { label: 'Zeus (Male)', value: 'aura-zeus-en' },
        ]},
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/v1/listen' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{}' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from Deepgram API' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('deepgram-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error) {
      throw new Error(`Deepgram API error: ${error.message}`);
    }
  },
};
