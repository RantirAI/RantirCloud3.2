import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const calendlyNode: NodePlugin = {
  type: 'calendly',
  name: 'Calendly',
  description: 'Manage scheduling and events with Calendly',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/calendly.png',
  color: '#006BFF',
  inputs: [
    {
      name: 'apiKey',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Calendly access token',
      isApiKey: true,
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
        { label: 'PATCH', value: 'PATCH' },
      ],
      description: 'HTTP method for the request',
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: true,
      placeholder: '/users/me',
      description: 'Calendly API endpoint (e.g., /users/me, /event_types)',
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      description: 'JSON request body (for POST, PUT, PATCH)',
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Calendly API response',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('calendly-action', {
      body: inputs,
    });

    if (error) throw error;
    return { result: data };
  },
};
