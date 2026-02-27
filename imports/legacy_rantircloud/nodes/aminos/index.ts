import { NodePlugin } from '@/types/node-plugin';

export const aminosNode: NodePlugin = {
  type: 'aminos',
  name: 'Aminos',
  description: 'Create User on Aminos One',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/aminos.png',
  color: '#22C55E',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Aminos API key',
      placeholder: 'aminos_key_...',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create User on Aminos One', value: 'create_user', description: 'Create a new user on Aminos One' },
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
    },
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      description: 'Username for the new user',
      placeholder: 'username',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'text',
      required: true,
      description: 'Password for the new user',
      placeholder: 'password',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the user creation was successful',
    },
    {
      name: 'userId',
      type: 'string',
      description: 'The ID of the created user',
    },
    {
      name: 'userData',
      type: 'object',
      description: 'The created user data',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if user creation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    
    const client = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await client.functions.invoke('aminos-proxy', {
      body: inputs,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};