import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bamboohrNode: NodePlugin = {
  type: 'bamboohr',
  name: 'BambooHR',
  description: 'Manage employee data and HR operations',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bamboohr.png',
  color: '#73C41D',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'BambooHR API key',
      isApiKey: true,
    },
    {
      name: 'subdomain',
      label: 'Subdomain',
      type: 'text',
      required: true,
      description: 'Your BambooHR subdomain',
      dependsOnApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'createCustomApiCall') {
      inputs.push(
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON request body',
        }
      );
    }
    
    return inputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Response data from BambooHR',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bamboohr-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
