import { NodePlugin } from '@/types/node-plugin';

export const chaindeskNode: NodePlugin = {
  type: 'chaindesk',
  name: 'Chaindesk',
  description: 'AI-powered customer support chatbots and agents',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chaindesk.png',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Chaindesk API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Query Agent', value: 'queryAgent' },
        { label: 'Query Datastore', value: 'queryDatastore' },
        { label: 'Upload File', value: 'uploadFile' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'agentId',
      label: 'Agent ID',
      type: 'text',
      required: false,
      description: 'ID of the Chaindesk agent',
      placeholder: 'agent-id',
      showWhen: {
        field: 'action',
        values: ['queryAgent']
      }
    },
    {
      name: 'datastoreId',
      label: 'Datastore ID',
      type: 'text',
      required: false,
      description: 'ID of the Chaindesk datastore',
      placeholder: 'datastore-id',
      showWhen: {
        field: 'action',
        values: ['queryDatastore', 'uploadFile']
      }
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      description: 'Message or query to send',
      placeholder: 'Hello, I need help with...',
      showWhen: {
        field: 'action',
        values: ['queryAgent', 'queryDatastore']
      }
    },
    {
      name: 'conversationId',
      label: 'Conversation ID',
      type: 'text',
      required: false,
      description: 'ID of the conversation (for continuing a conversation)',
      placeholder: 'conversation-id',
      showWhen: {
        field: 'action',
        values: ['queryAgent']
      }
    },
    {
      name: 'fileUrl',
      label: 'File URL',
      type: 'text',
      required: false,
      description: 'URL of the file to upload',
      placeholder: 'https://example.com/document.pdf',
      showWhen: {
        field: 'action',
        values: ['uploadFile']
      }
    },
    {
      name: 'fileName',
      label: 'File Name',
      type: 'text',
      required: false,
      description: 'Name for the uploaded file',
      placeholder: 'document.pdf',
      showWhen: {
        field: 'action',
        values: ['uploadFile']
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
      placeholder: '/agents',
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
      
      const { data, error } = await supabase.functions.invoke('chaindesk-proxy', {
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
      throw new Error(`Chaindesk execution failed: ${error.message}`);
    }
  }
};
