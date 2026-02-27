import { NodePlugin } from '@/types/node-plugin';

export const typeformNode: NodePlugin = {
  type: 'typeform',
  name: 'Typeform',
  description: 'Make custom API calls to Typeform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/typeform.png',
  color: '#262627',
  inputs: [
    {
      name: 'apiKey',
      label: 'Access Tokens',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Typeform personal access token',
      placeholder: 'Enter your Typeform access token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Custom API Call', value: 'createCustomApiCall' }
      ],
      description: 'Choose the action to perform'
    }
  ],
  getDynamicInputs(currentInputs) {
    if (currentInputs.action === 'createCustomApiCall') {
      return [
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
            { label: 'DELETE', value: 'DELETE' }
          ],
          description: 'HTTP method for the API call'
        },
        {
          name: 'endpoint',
          label: 'API Endpoint',
          type: 'text',
          required: true,
          description: 'Typeform API endpoint (e.g., /forms/{formId}/responses)',
          placeholder: '/forms/{formId}/responses'
        },
        {
          name: 'queryParams',
          label: 'Query Parameters',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Query parameters as JSON object',
          placeholder: '{ "page_size": 10 }'
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Request body as JSON (for POST/PUT)',
          placeholder: '{ "key": "value" }'
        }
      ];
    }
    return [];
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'API response data'
    },
    {
      name: 'endpoint',
      type: 'string',
      description: 'The endpoint called'
    },
    {
      name: 'method',
      type: 'string',
      description: 'HTTP method used'
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, method, endpoint, queryParams, body } = inputs;

    if (!apiKey) {
      throw new Error('Typeform API key is required');
    }

    if (action !== 'createCustomApiCall') {
      throw new Error(`Unknown action: ${action}`);
    }

    if (!endpoint) {
      throw new Error('API endpoint is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const requestBody: any = {
        apiKey,
        method: method || 'GET',
        endpoint
      };

      if (queryParams) {
        try {
          requestBody.queryParams = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
        } catch (e) {
          throw new Error('Invalid query parameters JSON');
        }
      }

      if (body && (method === 'POST' || method === 'PUT')) {
        try {
          requestBody.body = typeof body === 'string' ? JSON.parse(body) : body;
        } catch (e) {
          throw new Error('Invalid request body JSON');
        }
      }

      const { data, error } = await supabase.functions.invoke('typeform-proxy', {
        body: requestBody
      });

      if (error) {
        throw new Error(`Typeform API call failed: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        result: data.result,
        endpoint,
        method: method || 'GET'
      };
    } catch (error) {
      throw new Error(`Typeform operation failed: ${error.message}`);
    }
  }
};
