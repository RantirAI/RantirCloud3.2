import { NodePlugin } from '@/types/node-plugin';

export const cometapiNode: NodePlugin = {
  type: 'cometapi',
  name: 'CometAPI',
  description: 'CometAPI integration for AI-powered queries and custom API calls',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cometapi.png',
  color: '#25D366',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your CometAPI access token from cometapi.com',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask CometAPI', value: 'askCometApi' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'askCometApi') {
      inputs.push(
        { 
          name: 'model', 
          label: 'Model', 
          type: 'select' as const, 
          required: true, 
          default: 'gpt-4o-mini',
          options: [
            { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { label: 'GPT-4o', value: 'gpt-4o' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
            { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
            { label: 'Gemini Pro', value: 'gemini-pro' },
          ],
          description: 'AI model to use for the query'
        },
        { name: 'query', label: 'Query / Prompt', type: 'textarea' as const, required: true, description: 'Your question or prompt for the AI' },
        { name: 'context', label: 'System Context (Optional)', type: 'textarea' as const, required: false, description: 'System instructions or context for the AI' },
        { name: 'temperature', label: 'Temperature', type: 'number' as const, required: false, default: 0.7, description: 'Creativity level (0-2, default 0.7)' },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number' as const, required: false, default: 2048, description: 'Maximum tokens in response' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, placeholder: '/chat/completions', description: 'The API endpoint path (e.g., /chat/completions, /embeddings)' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'POST', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'JSON body for POST/PUT requests' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Full response data from CometAPI' },
    { name: 'response', type: 'string', description: 'AI response text from askCometApi' },
    { name: 'usage', type: 'object', description: 'Token usage information' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('cometapi-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
