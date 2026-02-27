import { NodePlugin } from '@/types/node-plugin';

export const datocmsNode: NodePlugin = {
  type: 'datocms',
  name: 'DatoCMS',
  description: 'Manage content with DatoCMS headless CMS',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/datocms.png',
  color: '#FF7751',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      placeholder: 'Enter your DatoCMS API token',
      description: 'Your DatoCMS full-access or read-only API token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Custom API Call', value: 'createCustomApiCall', description: 'Make a custom DatoCMS API request' },
      ],
      description: 'Select the DatoCMS action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'path', label: 'API Path', type: 'text', required: true, placeholder: '/items', description: 'DatoCMS API path' },
        { name: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{}' },
        { name: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', required: false, placeholder: '{}', description: 'Additional headers as JSON object' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Response from DatoCMS API' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('datocms-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        status: data?.status || 'ok',
      };
    } catch (error) {
      throw new Error(`DatoCMS API error: ${error.message}`);
    }
  },
};
