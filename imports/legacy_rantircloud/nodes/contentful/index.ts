import { NodePlugin } from '@/types/node-plugin';

export const contentfulNode: NodePlugin = {
  type: 'contentful',
  name: 'Contentful',
  description: 'Headless CMS for content management and delivery',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/contentful.png',
  color: '#2478CC',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Contentful Content Management API access token',
      isApiKey: true,
    },
    {
      name: 'spaceId',
      label: 'Space ID',
      type: 'text',
      required: true,
      description: 'Your Contentful Space ID',
    },
    {
      name: 'environmentId',
      label: 'Environment ID',
      type: 'text',
      required: false,
      default: 'master',
      description: 'Environment ID (default: master)',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Search Records', value: 'searchRecords' },
        { label: 'Get Record', value: 'getRecord' },
        { label: 'Create Record', value: 'createRecord' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'searchRecords') {
      inputs.push(
        { name: 'contentType', label: 'Content Type', type: 'text' as const, required: true, description: 'The content type ID to search' },
        { name: 'query', label: 'Search Query', type: 'text' as const, required: false, description: 'Search query string' },
        { name: 'limit', label: 'Limit', type: 'number' as const, required: false, default: 100, description: 'Number of records to return (max 1000)' },
        { name: 'skip', label: 'Skip', type: 'number' as const, required: false, description: 'Number of records to skip for pagination' },
        { name: 'order', label: 'Order By', type: 'text' as const, required: false, description: 'Field to order by (e.g., sys.createdAt, -sys.updatedAt)' },
        { name: 'filters', label: 'Additional Filters (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Additional query filters as JSON object' }
      );
    } else if (action === 'getRecord') {
      inputs.push(
        { name: 'entryId', label: 'Entry ID', type: 'text' as const, required: true, description: 'The ID of the entry to retrieve' },
        { name: 'locale', label: 'Locale', type: 'text' as const, required: false, description: 'The locale to retrieve (e.g., en-US)' }
      );
    } else if (action === 'createRecord') {
      inputs.push(
        { name: 'contentType', label: 'Content Type', type: 'text' as const, required: true, description: 'The content type ID for the new entry' },
        { name: 'fields', label: 'Fields (JSON)', type: 'code' as const, language: 'json' as const, required: true, description: 'Entry fields as JSON (locale-based, e.g., {"title": {"en-US": "My Title"}})' },
        { name: 'publish', label: 'Publish Immediately', type: 'select' as const, required: false, options: [
          { label: 'No (Draft)', value: 'false' },
          { label: 'Yes (Publish)', value: 'true' },
        ], description: 'Whether to publish the entry immediately after creation' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true, description: 'API endpoint path (e.g., /entries)' },
        { name: 'useManagementApi', label: 'Use Management API', type: 'select' as const, required: false, options: [
          { label: 'No (Delivery API)', value: 'false' },
          { label: 'Yes (Management API)', value: 'true' },
        ], description: 'Use Content Management API instead of Delivery API' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Contentful' },
    { name: 'items', type: 'array', description: 'Array of entries for search operations' },
    { name: 'total', type: 'number', description: 'Total count of matching records' },
    { name: 'entryId', type: 'string', description: 'Created entry ID' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('contentful-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
