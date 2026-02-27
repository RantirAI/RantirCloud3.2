import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bannerbearNode: NodePlugin = {
  type: 'bannerbear',
  name: 'Bannerbear',
  description: 'Generate images and videos from templates',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bannerbear.png',
  color: '#FF6B35',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Bannerbear API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Image', value: 'bannerbearCreateImage' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'bannerbearCreateImage') {
      inputs.push(
        {
          name: 'templateUid',
          label: 'Template UID',
          type: 'text',
          required: true,
          description: 'The UID of the template to use',
        },
        {
          name: 'modifications',
          label: 'Modifications',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON object with template modifications',
        }
      );
    } else if (currentInputs.action === 'createCustomApiCall') {
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
      description: 'Response data from Bannerbear',
    },
    {
      name: 'imageUrl',
      type: 'string',
      description: 'URL of the generated image',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bannerbear-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
