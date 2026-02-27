import { NodePlugin } from '@/types/node-plugin';

export const certopusNode: NodePlugin = {
  type: 'certopus',
  name: 'Certopus',
  description: 'Generate and manage digital certificates and credentials',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/certopus.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Certopus API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Credential', value: 'createCredential' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'templateId',
      label: 'Template ID',
      type: 'text',
      required: false,
      description: 'Credential template ID',
      placeholder: 'template-id',
      showWhen: {
        field: 'action',
        values: ['createCredential']
      }
    },
    {
      name: 'recipientName',
      label: 'Recipient Name',
      type: 'text',
      required: false,
      description: 'Name of the credential recipient',
      placeholder: 'John Doe',
      showWhen: {
        field: 'action',
        values: ['createCredential']
      }
    },
    {
      name: 'recipientEmail',
      label: 'Recipient Email',
      type: 'text',
      required: false,
      description: 'Email of the credential recipient',
      placeholder: 'john@example.com',
      showWhen: {
        field: 'action',
        values: ['createCredential']
      }
    },
    {
      name: 'customFields',
      label: 'Custom Fields',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Custom fields for the credential',
      placeholder: '{\n  "course": "Web Development",\n  "date": "2024-01-15"\n}',
      showWhen: {
        field: 'action',
        values: ['createCredential']
      }
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
      ],
      description: 'HTTP method for custom API call',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'API endpoint path',
      placeholder: '/credentials',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{}',
      description: 'Request body for POST/PUT requests',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
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
      
      const { data, error } = await supabase.functions.invoke('certopus-proxy', {
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
      throw new Error(`Certopus execution failed: ${error.message}`);
    }
  }
};
