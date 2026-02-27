import { NodePlugin } from '@/types/node-plugin';

export const chatsistantNode: NodePlugin = {
  type: 'chatsistant',
  name: 'Chatsistant',
  description: 'AI assistant platform for customer engagement and support',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chatsistant.png',
  color: '#EC4899',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Chatsistant API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'sendMessage') {
      inputs.push(
        { name: 'chatbotUuid', label: 'Chatbot UUID', type: 'text' as const, required: true, description: 'Your Chatsistant chatbot UUID' },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true },
        { name: 'sessionId', label: 'Session ID', type: 'text' as const, required: false, description: 'Optional session ID (will create new if not provided)' },
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Chatsistant' },
    { name: 'response', type: 'string', description: 'Assistant response message' },
    { name: 'sessionId', type: 'string', description: 'Session ID for continuing conversation' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('chatsistant-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
