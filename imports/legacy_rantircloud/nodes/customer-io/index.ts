import { NodePlugin } from '@/types/node-plugin';

export const customerIoNode: NodePlugin = {
  type: 'customer-io',
  name: 'Customer.io',
  description: 'Marketing automation for targeted emails, push, SMS, and event tracking',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/customerio.png',
  color: '#5028C6',
  inputs: [
    { name: 'siteId', label: 'Site ID', type: 'text', required: true, description: 'Your Customer.io Site ID (Track API)', isApiKey: true },
    { name: 'apiKey', label: 'Track API Key', type: 'text', required: true, description: 'Your Customer.io Tracking API key', isApiKey: true },
    { name: 'appApiKey', label: 'App API Key', type: 'text', required: false, description: 'Your Customer.io App API key (required for transactional emails, campaigns, segments, broadcasts, and custom API calls)', isApiKey: true },
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Create Event', value: 'createEvent' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
    },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'createEvent') {
      inputs.push(
        { name: 'customerId', label: 'Customer ID', type: 'text' as const, required: true },
        { name: 'eventName', label: 'Event Name', type: 'text' as const, required: true },
        { name: 'eventData', label: 'Event Data (JSON)', type: 'code' as const, language: 'json' as const, required: false, placeholder: '{"key": "value"}' },
      );
    }
    if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' }, { label: 'PATCH', value: 'PATCH' }] },
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, placeholder: '/v1/customers', description: 'Relative endpoint path' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false },
      );
    }
    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if failed' },
  ],
  async execute(inputs) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );
    const { data, error } = await supabase.functions.invoke('customer-io-proxy', { body: inputs });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
