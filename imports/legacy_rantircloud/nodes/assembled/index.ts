import { NodePlugin } from '@/types/node-plugin';

export const assembledNode: NodePlugin = {
  type: 'assembled',
  name: 'Assembled',
  description: 'Workforce management and scheduling',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/assembled.png',
  color: '#5B4DFF',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your Assembled API key',
      description: 'Your Assembled API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Custom API Call', value: 'customApiCall' },
        { label: 'Custom GraphQL', value: 'customGraphql' },
        { label: 'OOO', value: 'OOO' },
        { label: 'Add Shift', value: 'addShift' },
        { label: 'Create OOO Request', value: 'createOOORequest' },
        { label: 'Update OOO Request', value: 'updateOOORequest' },
        { label: 'Delete OOO Request', value: 'deleteOOORequest' },
      ],
      description: 'Select the Assembled action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'Endpoint', type: 'text', required: true, placeholder: '/api/endpoint' },
        { name: 'method', label: 'Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body', type: 'textarea', required: false, placeholder: 'JSON body' }
      );
    } else if (action === 'customGraphql') {
      inputs.push(
        { name: 'query', label: 'GraphQL Query', type: 'textarea', required: true, placeholder: 'Enter GraphQL query' }
      );
    } else if (action === 'addShift') {
      inputs.push(
        { name: 'agentId', label: 'Agent ID', type: 'text', required: true, placeholder: 'Enter agent ID' },
        { name: 'startTime', label: 'Start Time', type: 'text', required: true, placeholder: '2024-01-01T09:00:00Z' },
        { name: 'endTime', label: 'End Time', type: 'text', required: true, placeholder: '2024-01-01T17:00:00Z' }
      );
    } else if (action === 'createOOORequest' || action === 'updateOOORequest') {
      inputs.push(
        { name: 'agentId', label: 'Agent ID', type: 'text', required: true, placeholder: 'Enter agent ID' },
        { name: 'startDate', label: 'Start Date', type: 'text', required: true, placeholder: '2024-01-01' },
        { name: 'endDate', label: 'End Date', type: 'text', required: true, placeholder: '2024-01-07' },
        { name: 'reason', label: 'Reason', type: 'textarea', required: false, placeholder: 'Vacation, sick leave, etc.' }
      );
      if (action === 'updateOOORequest') {
        inputs.push({ name: 'requestId', label: 'Request ID', type: 'text', required: true, placeholder: 'Enter request ID' });
      }
    } else if (action === 'deleteOOORequest') {
      inputs.push(
        { name: 'requestId', label: 'Request ID', type: 'text', required: true, placeholder: 'Enter request ID' }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Response from Assembled API',
    },
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...params } = inputs;
    
    if (!apiKey) {
      throw new Error('Assembled API key is required');
    }
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('assembled-action', {
        body: { apiKey, action, ...params },
      });

      if (error) throw error;

      return {
        result: data,
      };
    } catch (error) {
      throw new Error(`Assembled API error: ${error.message}`);
    }
  },
};
