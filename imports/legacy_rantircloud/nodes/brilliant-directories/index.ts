import { NodePlugin } from '@/types/node-plugin';

export const brilliantDirectoriesNode: NodePlugin = {
  type: 'brilliant-directories',
  name: 'Brilliant Directories',
  description: 'Manage directory and membership sites with Brilliant Directories',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/brilliant-directories.png',
  color: '#FF6B35',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Brilliant Directories API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'websiteId',
      label: 'Website ID',
      type: 'text',
      required: true,
      description: 'Your Brilliant Directories website ID',
      placeholder: 'website-id',
      dependsOnApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create New User', value: 'createNewUser' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: true,
      description: 'User email address',
      placeholder: 'user@example.com',
      showWhen: {
        field: 'action',
        values: ['createNewUser']
      }
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: false,
      description: 'User first name',
      placeholder: 'John',
      showWhen: {
        field: 'action',
        values: ['createNewUser']
      }
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: false,
      description: 'User last name',
      placeholder: 'Doe',
      showWhen: {
        field: 'action',
        values: ['createNewUser']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method for the API call',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: true,
      description: 'Brilliant Directories API endpoint',
      placeholder: '/api/v1/members',
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
      placeholder: '{\n  "email": "user@example.com",\n  "name": "John Doe"\n}',
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
      description: 'Response data',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Operation success status',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, websiteId, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!websiteId) {
      throw new Error('Website ID is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('brilliant-directories-proxy', {
        body: {
          apiKey,
          websiteId,
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
      throw new Error(`Brilliant Directories execution failed: ${error.message}`);
    }
  }
};
