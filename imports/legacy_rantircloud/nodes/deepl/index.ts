import { NodePlugin } from '@/types/node-plugin';

export const deeplNode: NodePlugin = {
  type: 'deepl',
  name: 'DeepL',
  description: 'AI-powered language translation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/deepl.png',
  color: '#0F2B46',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your DeepL API key',
      description: 'Your DeepL API key (free or pro)',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Translate Text', value: 'translateText', description: 'Translate text to a target language' },
        { label: 'Custom API Call', value: 'createCustomApiCall', description: 'Make a custom DeepL API request' },
      ],
      description: 'Select the DeepL action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'translateText') {
      inputs.push(
        { name: 'text', label: 'Text to Translate', type: 'textarea', required: true, placeholder: 'Hello, how are you?' },
        { name: 'targetLang', label: 'Target Language', type: 'select', required: true, options: [
          { label: 'English (US)', value: 'EN-US' },
          { label: 'English (UK)', value: 'EN-GB' },
          { label: 'German', value: 'DE' },
          { label: 'French', value: 'FR' },
          { label: 'Spanish', value: 'ES' },
          { label: 'Italian', value: 'IT' },
          { label: 'Portuguese (BR)', value: 'PT-BR' },
          { label: 'Portuguese (PT)', value: 'PT-PT' },
          { label: 'Dutch', value: 'NL' },
          { label: 'Polish', value: 'PL' },
          { label: 'Russian', value: 'RU' },
          { label: 'Japanese', value: 'JA' },
          { label: 'Chinese (Simplified)', value: 'ZH-HANS' },
          { label: 'Korean', value: 'KO' },
          { label: 'Arabic', value: 'AR' },
          { label: 'Turkish', value: 'TR' },
          { label: 'Swedish', value: 'SV' },
          { label: 'Danish', value: 'DA' },
          { label: 'Finnish', value: 'FI' },
          { label: 'Czech', value: 'CS' },
          { label: 'Romanian', value: 'RO' },
          { label: 'Ukrainian', value: 'UK' },
        ]},
        { name: 'sourceLang', label: 'Source Language (optional)', type: 'select', required: false, options: [
          { label: 'Auto Detect', value: '' },
          { label: 'English', value: 'EN' },
          { label: 'German', value: 'DE' },
          { label: 'French', value: 'FR' },
          { label: 'Spanish', value: 'ES' },
          { label: 'Italian', value: 'IT' },
          { label: 'Japanese', value: 'JA' },
          { label: 'Chinese', value: 'ZH' },
          { label: 'Korean', value: 'KO' },
          { label: 'Russian', value: 'RU' },
          { label: 'Arabic', value: 'AR' },
        ]},
        { name: 'formality', label: 'Formality', type: 'select', required: false, default: 'default', options: [
          { label: 'Default', value: 'default' },
          { label: 'More Formal', value: 'more' },
          { label: 'Less Formal', value: 'less' },
          { label: 'Prefer More', value: 'prefer_more' },
          { label: 'Prefer Less', value: 'prefer_less' },
        ]},
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/v2/translate' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{}' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from DeepL API' },
    { name: 'translatedText', type: 'string', description: 'Translated text (for translate action)' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('deepl-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        translatedText: data?.translations?.[0]?.text || data?.translatedText || '',
        status: data?.status || 'ok',
      };
    } catch (error: any) {
      throw new Error(`DeepL API error: ${error.message}`);
    }
  },
};
