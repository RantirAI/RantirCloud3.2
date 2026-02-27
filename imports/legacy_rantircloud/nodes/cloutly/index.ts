import { NodePlugin } from '@/types/node-plugin';

export const cloutlyNode: NodePlugin = {
  type: 'cloutly',
  name: 'Cloutly',
  description: 'Review management and reputation platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cloutly.svg',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cloutly API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Review Invite', value: 'sendReviewInvite' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'sendReviewInvite') {
      inputs.push(
        { name: 'customerEmail', label: 'Customer Email', type: 'text' as const, required: true, description: 'Email address of the customer' },
        { name: 'customerName', label: 'Customer Name', type: 'text' as const, required: false, description: 'Name of the customer' },
        { name: 'customerPhone', label: 'Customer Phone', type: 'text' as const, required: false, description: 'Phone number of the customer' },
        { name: 'templateId', label: 'Template ID', type: 'text' as const, required: false, description: 'ID of the review invite template' },
        { name: 'sendImmediately', label: 'Send Immediately', type: 'boolean' as const, required: false, default: true, description: 'Send the invite immediately' },
        { name: 'customMessage', label: 'Custom Message', type: 'textarea' as const, required: false, description: 'Custom message to include in the invite' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'API endpoint path' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
        ]},
        { name: 'headers', label: 'Headers (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Custom headers as JSON object' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Request body as JSON' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'inviteId', type: 'string', description: 'Review invite ID' },
    { name: 'status', type: 'string', description: 'Invite status' },
    { name: 'message', type: 'string', description: 'Human-readable result message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('cloutly-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
