import { NodePlugin } from '@/types/node-plugin';

export const clearoutNode: NodePlugin = {
  type: 'clearout',
  name: 'Clearout',
  description: 'Email verification and validation service',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clearout.png',
  color: '#00C853',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your Clearout API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Instant Verify', value: 'instantVerify' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'instantVerify') {
      inputs.push(
        { name: 'email', label: 'Email Address', type: 'text' as const, required: true, description: 'Email address to verify' },
        { name: 'timeout', label: 'Timeout (seconds)', type: 'number' as const, required: false, default: 60, description: 'Maximum time to wait for verification (10-90 seconds). Some email servers may take longer.' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'isValid', type: 'boolean', description: 'Whether the email is valid' },
    { name: 'status', type: 'string', description: 'Email verification status' },
    { name: 'emailStatus', type: 'string', description: 'Detailed email status (valid, invalid, unknown, timeout, etc.)' },
    { name: 'message', type: 'string', description: 'Human-readable verification result message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clearout-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
