import { NodePlugin } from '@/types/node-plugin';

export const apitableNode: NodePlugin = {
  type: 'apitable',
  name: 'APITable',
  description: 'Connect to APITable for database and spreadsheet operations',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/apitable.png',
  color: '#7C3AED',
  inputs: [
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your APITable API token',
      placeholder: 'usk...',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Record Action', value: 'createRecordAction', description: 'Create a new record' },
        { label: 'Update Record Action', value: 'updateRecordAction', description: 'Update an existing record' },
        { label: 'Find Record Action', value: 'findRecordAction', description: 'Find records from a datasheet' },
        { label: 'Custom API Call', value: 'customApiCall', description: 'Make a custom API call to any APITable endpoint' },
      ],
      description: 'Choose the action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const baseInputs = [
      {
        name: 'spaceId',
        label: 'Space ID',
        type: 'text' as const,
        required: true,
        description: 'The space ID (required) - get this from your APITable workspace URL',
        placeholder: 'spc...',
      },
      {
        name: 'datasheetId',
        label: 'Datasheet ID',
        type: 'text' as const,
        required: true,
        description: 'The datasheet ID (required for record operations)',
        placeholder: 'dst...',
      },
    ];

    switch (action) {
      case 'createRecordAction':
        return [
          ...baseInputs,
          {
            name: 'fields',
            label: 'Fields',
            type: 'code' as const,
            language: 'json' as const,
            required: true,
            description: 'Record fields (JSON format)',
            placeholder: '{\n  "Name": "John Doe",\n  "Email": "john@example.com"\n}',
          },
        ];
      case 'updateRecordAction':
        return [
          ...baseInputs,
          {
            name: 'recordId',
            label: 'Record ID',
            type: 'text' as const,
            required: true,
            description: 'The record ID to update',
            placeholder: 'rec...',
          },
          {
            name: 'fields',
            label: 'Fields',
            type: 'code' as const,
            language: 'json' as const,
            required: true,
            description: 'Record fields to update (JSON format)',
            placeholder: '{\n  "Name": "Updated Name",\n  "Email": "updated@example.com"\n}',
          },
        ];
      case 'findRecordAction':
        return [
          ...baseInputs,
          {
            name: 'view',
            label: 'View ID (Optional)',
            type: 'text' as const,
            required: false,
            description: 'The view ID to filter records',
            placeholder: 'viw...',
          },
          {
            name: 'pageSize',
            label: 'Page Size (Optional)',
            type: 'number' as const,
            required: false,
            description: 'Number of records to return (default: 100)',
            placeholder: '100',
          },
        ];
      case 'customApiCall':
        return [
          {
            name: 'spaceId',
            label: 'Space ID',
            type: 'text' as const,
            required: true,
            description: 'The space ID for workspace context',
            placeholder: 'spc...',
          },
          {
            name: 'method',
            label: 'HTTP Method',
            type: 'select' as const,
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' },
            ],
            description: 'HTTP method for the API call',
          },
          {
            name: 'endpointPath',
            label: 'Endpoint Path',
            type: 'text' as const,
            required: true,
            description: 'API endpoint path (e.g., /datasheets/{datasheetId}/fields, /spaces, /datasheets)',
            placeholder: '/datasheets/{datasheetId}/records',
          },
          {
            name: 'requestBody',
            label: 'Request Body (Optional)',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Request body in JSON format (for POST/PATCH requests)',
            placeholder: '{\n  "records": [{\n    "fields": {\n      "Name": "John Doe"\n    }\n  }]\n}',
          },
          {
            name: 'queryParams',
            label: 'Query Parameters (Optional)',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Query parameters in JSON format',
            placeholder: '{\n  "viewId": "viw123",\n  "pageSize": 100\n}',
          },
          {
            name: 'customHeaders',
            label: 'Custom Headers (Optional)',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'Additional headers in JSON format (Authorization will be added automatically)',
            placeholder: '{\n  "X-Custom-Header": "value"\n}',
          },
          {
            name: 'urlParams',
            label: 'URL Parameters (Optional)',
            type: 'code' as const,
            language: 'json' as const,
            required: false,
            description: 'URL parameters for path replacement (e.g., {datasheetId} -> dst123)',
            placeholder: '{\n  "datasheetId": "dst123",\n  "recordId": "rec456"\n}',
          },
        ];
      default:
        return baseInputs;
    }
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
      description: 'The response data from APITable',
    },
    {
      name: 'records',
      type: 'array',
      description: 'Array of records (for list operations)',
    },
    {
      name: 'record',
      type: 'object',
      description: 'Single record data',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
    {
      name: 'status',
      type: 'number',
      description: 'HTTP response status code',
    },
    {
      name: 'headers',
      type: 'object',
      description: 'Response headers',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    
    const client = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await client.functions.invoke('apitable-proxy', {
      body: inputs,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },
};