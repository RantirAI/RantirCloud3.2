import { NodePlugin } from '@/types/node-plugin';

export const ashbyNode: NodePlugin = {
  type: 'ashby',
  name: 'Ashby',
  description: 'Connect to Ashby ATS for recruiting and candidate management',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/ashby.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Ashby API key',
      placeholder: 'ashby_api_...',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call to Ashby' },
      ],
      description: 'Choose the action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: true,
      description: 'The API endpoint to call (e.g., candidate.list)',
      placeholder: 'candidate.list',
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
      default: 'POST',
      description: 'HTTP method for the request',
    },
    {
      name: 'requestBody',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      description: 'JSON request body for the API call',
      placeholder: '{\n  "limit": 50\n}',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Ashby',
    },
    {
      name: 'statusCode',
      type: 'number',
      description: 'HTTP status code of the response',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    
    const client = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await client.functions.invoke('ashby-proxy', {
      body: inputs,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};