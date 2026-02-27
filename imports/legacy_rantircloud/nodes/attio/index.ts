import { NodePlugin } from '@/types/node-plugin';

export const attioNode: NodePlugin = {
  type: 'attio',
  name: 'Attio',
  description: 'Manage contacts and records in Attio CRM',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/attio.png',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Attio Access Token',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Record', value: 'createRecord' },
        { label: 'Update Record', value: 'updateRecord' },
        { label: 'Find Record', value: 'findRecord' },
        { label: 'Create Entry', value: 'createEntry' },
        { label: 'Update Entry', value: 'updateEntry' },
        { label: 'Find List Entry', value: 'findListEntry' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs: any[] = [];

    if (action === 'createRecord' || action === 'updateRecord' || action === 'findRecord') {
      inputs.push({
        name: 'objectType',
        label: 'Object Type',
        type: 'text',
        required: true,
        description: 'Object type (e.g., people, companies)',
      });
    }

    if (action === 'updateRecord' || action === 'findRecord') {
      inputs.push({
        name: 'recordId',
        label: 'Record ID',
        type: 'text',
        required: true,
        description: 'Record ID',
      });
    }

    if (action === 'createRecord' || action === 'updateRecord') {
      inputs.push({
        name: 'data',
        label: 'Record Data',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON data for the record',
      });
    }

    if (action === 'createEntry' || action === 'updateEntry' || action === 'findListEntry') {
      inputs.push({
        name: 'listId',
        label: 'List ID',
        type: 'text',
        required: true,
        description: 'List ID',
      });
    }

    if (action === 'updateEntry' || action === 'findListEntry') {
      inputs.push({
        name: 'entryId',
        label: 'Entry ID',
        type: 'text',
        required: true,
        description: 'Entry ID',
      });
    }

    if (action === 'createEntry' || action === 'updateEntry') {
      inputs.push({
        name: 'entryData',
        label: 'Entry Data',
        type: 'code',
        language: 'json',
        required: true,
        description: 'JSON data for the entry',
      });
    }

    if (action === 'createCustomApiCall') {
      inputs.push({
        name: 'endpoint',
        label: 'API Endpoint',
        type: 'text',
        required: true,
        description: 'API endpoint path (e.g., /v2/objects/people)',
      });
      inputs.push({
        name: 'method',
        label: 'HTTP Method',
        type: 'select',
        required: true,
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      });
      inputs.push({
        name: 'body',
        label: 'Request Body',
        type: 'code',
        language: 'json',
        required: false,
        description: 'JSON body for the request',
      });
    }

    return inputs;
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
      description: 'Response data from Attio',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      context.envVars?.SUPABASE_URL || '',
      context.envVars?.SUPABASE_ANON_KEY || ''
    );

    const { data, error } = await supabase.functions.invoke('attio-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
