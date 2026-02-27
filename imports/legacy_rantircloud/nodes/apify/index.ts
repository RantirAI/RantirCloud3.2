import { NodePlugin } from '@/types/node-plugin';

export const apifyNode: NodePlugin = {
  type: 'apify',
  name: 'Apify',
  description: 'Connect to Apify platform for web scraping and automation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/apify.svg',
  color: '#FF6B35',
  inputs: [
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your Apify API token',
      placeholder: 'apify_api_...',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Dataset Items', value: 'getDatasetItems', description: 'Get dataset items' },
        { label: 'Get Actors', value: 'getActors', description: 'Get list of actors' },
        { label: 'Get Last Run', value: 'getLastRun', description: 'Get last actor run' },
        { label: 'Start Actor', value: 'startActor', description: 'Start an actor' },
      ],
      description: 'Choose the action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'actorId',
      label: 'Actor ID',
      type: 'text',
      required: true,
      description: 'The ID or name of the Apify actor',
      placeholder: 'actor-id or username/actor-name',
    },
    {
      name: 'input',
      label: 'Actor Input',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Input configuration for the actor (JSON format)',
      placeholder: '{\n  "startUrls": [{"url": "https://example.com"}],\n  "maxRequestRetries": 3\n}',
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
      description: 'The response data from Apify',
    },
    {
      name: 'runId',
      type: 'string',
      description: 'The ID of the actor run',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Status of the actor run',
    },
    {
      name: 'items',
      type: 'array',
      description: 'Dataset items (if applicable)',
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

    const { data, error } = await client.functions.invoke('apify-proxy', {
      body: inputs,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};