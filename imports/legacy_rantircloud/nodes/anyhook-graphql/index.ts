import { NodePlugin } from '@/types/node-plugin';

export const anyhookGraphqlNode: NodePlugin = {
  type: 'anyhook-graphql',
  name: 'Anyhook GraphQL',
  description: 'Connect to Anyhook GraphQL API for webhook management and GraphQL operations',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/anyhook-graphql.png',
  color: '#E11D48',
  inputs: [
    {
      name: 'serverUrl',
      label: 'Server URL',
      type: 'text',
      required: true,
      description: 'The Anyhook GraphQL server URL',
      placeholder: 'https://api.anyhook.com/graphql',
    },
    {
      name: 'endpointUrl',
      label: 'Endpoint URL',
      type: 'text',
      required: true,
      description: 'The GraphQL websocket to connect to',
      placeholder: 'wss://streaming.bitquery.io/graphql?token=xxxx',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Subscription', value: 'subscription', description: 'Create a GraphQL subscription' },
      ],
      description: 'Choose the GraphQL action type',
    },
    {
      name: 'query',
      label: 'GraphQL Query',
      type: 'code',
      language: 'javascript',
      required: true,
      description: 'Your GraphQL subscription',
      placeholder: `subscription OnWebhookEvent {
  webhook {
    id
    url
    event
    payload
  }
}`,
    },
    {
      name: 'variables',
      label: 'Variables',
      type: 'code',
      language: 'json',
      required: false,
      description: 'GraphQL variables (JSON format)',
      placeholder: '{\n  "id": "webhook_123"\n}',
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
      description: 'The GraphQL response data',
    },
    {
      name: 'errors',
      type: 'array',
      description: 'GraphQL errors if any',
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

    const { data, error } = await client.functions.invoke('anyhook-graphql-proxy', {
      body: inputs,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};