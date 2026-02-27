import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const bonjoroNode: NodePlugin = {
  type: 'bonjoro',
  name: 'Bonjoro',
  description: 'Manage video messages and tasks in Bonjoro',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/bonjoro.png',
  color: '#FF6B6B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Bonjoro API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create a Greet', value: 'createGreet' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      required: true,
      description: 'Email to send greet to',
      showWhen: {
        field: 'action',
        values: ['createGreet']
      }
    },
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: false,
      description: 'First name of the person to greet',
      showWhen: {
        field: 'action',
        values: ['createGreet']
      }
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: false,
      description: 'Last name of the person to greet',
      showWhen: {
        field: 'action',
        values: ['createGreet']
      }
    },
    {
      name: 'note',
      label: 'Note',
      type: 'text',
      required: true,
      description: 'Note to send with the greet',
      showWhen: {
        field: 'action',
        values: ['createGreet']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      description: 'Custom API endpoint',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'customData',
      label: 'Request Data',
      type: 'code',
      language: 'json',
      description: 'Data to send with the request',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Bonjoro API response',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('bonjoro-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
