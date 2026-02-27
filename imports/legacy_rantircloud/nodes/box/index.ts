import { NodePlugin } from '@/types/node-plugin';

export const boxNode: NodePlugin = {
  type: 'box',
  name: 'Box',
  description: 'Interact with Box cloud storage - upload, download, and manage files',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/box.png',
  color: '#0061D5',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Box API access token',
      placeholder: 'your-box-api-token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
      description: 'HTTP method for the API call',
      dependsOnApiKey: true,
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'Box API endpoint path (e.g., /2.0/folders/0/items)',
      placeholder: '/2.0/folders/0/items',
      dependsOnApiKey: true,
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "name": "New Folder",\n  "parent": {"id": "0"}\n}',
      description: 'Request body for POST/PUT/PATCH requests',
      showWhen: {
        field: 'method',
        values: ['POST', 'PUT', 'PATCH']
      }
    },
    {
      name: 'queryParams',
      label: 'Query Parameters',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "limit": 100,\n  "offset": 0\n}',
      description: 'URL query parameters',
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Response data from Box API',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('Box API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('box-proxy', {
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
      throw new Error(`Box execution failed: ${error.message}`);
    }
  }
};
