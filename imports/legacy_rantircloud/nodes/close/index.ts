import { NodePlugin } from '@/types/node-plugin';

export const closeNode: NodePlugin = {
  type: 'close',
  name: 'Close',
  description: 'Sales CRM for startups and small businesses',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/close.png',
  color: '#2E7EE6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Close API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Lead', value: 'createLead' },
        { label: 'Create Contact', value: 'createContact' },
        { label: 'Find Lead', value: 'findLead' },
        { label: 'Create Opportunity', value: 'createOpportunity' },
        { label: 'Find Contact', value: 'findContact' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createLead') {
      inputs.push(
        { name: 'name', label: 'Company Name', type: 'text' as const, required: true },
        { name: 'url', label: 'Website URL', type: 'text' as const, required: false },
        { name: 'description', label: 'Description', type: 'textarea' as const, required: false },
        { name: 'statusId', label: 'Status ID', type: 'text' as const, required: false },
        { name: 'contacts', label: 'Contacts (JSON array)', type: 'code' as const, language: 'json' as const, required: false, description: 'Array of contact objects with name, email, phone' }
      );
    } else if (action === 'createContact') {
      inputs.push(
        { name: 'leadId', label: 'Lead ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Contact Name', type: 'text' as const, required: true },
        { name: 'title', label: 'Title', type: 'text' as const, required: false },
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'phone', label: 'Phone', type: 'text' as const, required: false }
      );
    } else if (action === 'findLead') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'text' as const, required: true, description: 'Search by name, email, or Close query syntax' },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 25 }
      );
    } else if (action === 'createOpportunity') {
      inputs.push(
        { name: 'leadId', label: 'Lead ID', type: 'text' as const, required: true },
        { name: 'statusId', label: 'Status ID', type: 'text' as const, required: true },
        { name: 'value', label: 'Value (cents)', type: 'number' as const, required: false },
        { name: 'valuePeriod', label: 'Value Period', type: 'select' as const, required: false, options: [
          { label: 'One-Time', value: 'one_time' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Annual', value: 'annual' },
        ]},
        { name: 'confidence', label: 'Confidence (%)', type: 'number' as const, required: false },
        { name: 'note', label: 'Note', type: 'textarea' as const, required: false }
      );
    } else if (action === 'findContact') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'text' as const, required: true, description: 'Search by name, email, or phone' },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 25 }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path (e.g., /lead/)' },
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
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('close-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
