import { NodePlugin } from '@/types/node-plugin';

export const chainalysisApiNode: NodePlugin = {
  type: 'chainalysis-api',
  name: 'Chainalysis API',
  description: 'Blockchain analytics and compliance - screen addresses and transactions',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chainalysis-api.jpg',
  color: '#1E3A8A',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Chainalysis API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Check Address Sanction', value: 'checkAddressSanction' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'address',
      label: 'Blockchain Address',
      type: 'text',
      required: false,
      description: 'Cryptocurrency address to check for sanctions',
      placeholder: '0x...',
      showWhen: {
        field: 'action',
        values: ['checkAddressSanction']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Operation result data',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Success indicator',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('chainalysis-api-proxy', {
        body: {
          apiKey,
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Chainalysis execution failed: ${error.message}`);
    }
  }
};
