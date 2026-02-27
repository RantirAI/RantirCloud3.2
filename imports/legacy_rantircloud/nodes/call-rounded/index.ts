import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const callRoundedNode: NodePlugin = {
  type: 'call-rounded',
  name: 'CallRounded',
  description: 'Manage voice calls and communication',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/call-rounded.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your CallRounded API key',
      isApiKey: true,
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: true,
      description: 'API endpoint path (e.g., /calls, /messages)',
      placeholder: '/calls',
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
      description: 'HTTP method',
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Request body (JSON format)',
      placeholder: '{\n  "key": "value"\n}',
      showWhen: { field: 'method', values: ['POST', 'PUT', 'PATCH'] },
    },
    {
      name: 'queryParams',
      label: 'Query Parameters',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Query parameters (JSON format)',
      placeholder: '{\n  "param": "value"\n}',
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'CallRounded API response',
    },
  ],
  async execute(inputs) {
    // Normalize and validate required fields
    const apiKey = inputs.apiKey;
    const method = inputs.method || 'GET';
    const endpoint = inputs.endpoint;

    if (!apiKey) throw new Error('API Key is required');
    if (!endpoint) throw new Error('API Endpoint is required');

    // Parse body and query params if user entered JSON as string
    let body = inputs.body;
    let queryParams = inputs.queryParams;

    try {
      if (typeof body === 'string' && body.trim()) body = JSON.parse(body);
    } catch {}

    try {
      if (typeof queryParams === 'string' && queryParams.trim()) queryParams = JSON.parse(queryParams);
    } catch {}

    const { data, error } = await supabase.functions.invoke('call-rounded-action', {
      body: { apiKey, method, endpoint, body, queryParams },
    });

    if (error) throw error;
    return { result: data };
  },
};
