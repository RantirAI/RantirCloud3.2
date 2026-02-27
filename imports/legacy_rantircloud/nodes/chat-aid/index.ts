import { NodePlugin } from '@/types/node-plugin';

export const chatAidNode: NodePlugin = {
  type: 'chat-aid',
  name: 'Chat Aid',
  description: 'AI-powered chat assistance and customer support automation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chat-aid.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Chat Aid API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Custom Sources', value: 'addCustomSources' },
        { label: 'Ask Questions', value: 'askQuestions' },
        { label: 'Get Custom Source By ID', value: 'getCustomSourceById' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'addCustomSources') {
      inputs.push(
        { name: 'teamId', label: 'Team ID (Optional)', type: 'text' as const, required: false, description: 'Optional team ID, defaults to org-wide' },
        { name: 'files', label: 'Files (JSON Array)', type: 'code' as const, language: 'json' as const, required: true, description: 'Array of file objects to upload as custom sources' }
      );
    } else if (action === 'askQuestions') {
      inputs.push(
        { name: 'prompt', label: 'Question', type: 'textarea' as const, required: true, description: 'The question to ask the knowledge base' },
        { name: 'parentTs', label: 'Parent Timestamp', type: 'text' as const, required: false, description: 'Optional Unix timestamp for conversation threading' },
        { name: 'messageTs', label: 'Message Timestamp', type: 'text' as const, required: false, description: 'Optional Unix timestamp of current message for follow-up questions' }
      );
    } else if (action === 'getCustomSourceById') {
      inputs.push(
        { name: 'sourceId', label: 'Source ID', type: 'text' as const, required: true, description: 'The ID of the custom source to retrieve' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true, description: 'API endpoint path (e.g., /external/sources/custom)' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Chat Aid' },
    { name: 'response', type: 'string', description: 'Bot response message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('chat-aid-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
