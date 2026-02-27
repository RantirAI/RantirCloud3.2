import { NodePlugin } from '@/types/node-plugin';

export const cognitoFormsNode: NodePlugin = {
  type: 'cognito-forms',
  name: 'Cognito Forms',
  description: 'Build smart forms with calculations, document generation, and payment integration',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cognito-forms.png',
  color: '#00A6ED',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cognito Forms API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Forms', value: 'getForms' },
        { label: 'Get Form Entries', value: 'getFormEntries' },
        { label: 'Create Entry', value: 'createEntry' },
        { label: 'Update Entry', value: 'updateEntry' },
        { label: 'Delete Entry', value: 'deleteEntry' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'getFormEntries') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true, description: 'The ID of the form' }
      );
    } else if (action === 'createEntry') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true, description: 'The ID of the form' },
        { name: 'entryData', label: 'Entry Data (JSON)', type: 'code' as const, language: 'json' as const, required: true, description: 'JSON object with form field values' }
      );
    } else if (action === 'updateEntry') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true },
        { name: 'entryId', label: 'Entry ID', type: 'text' as const, required: true },
        { name: 'entryData', label: 'Entry Data (JSON)', type: 'code' as const, language: 'json' as const, required: true }
      );
    } else if (action === 'deleteEntry') {
      inputs.push(
        { name: 'formId', label: 'Form ID', type: 'text' as const, required: true },
        { name: 'entryId', label: 'Entry ID', type: 'text' as const, required: true }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Cognito Forms' },
    { name: 'forms', type: 'array', description: 'List of forms' },
    { name: 'entries', type: 'array', description: 'List of form entries' },
    { name: 'entry', type: 'object', description: 'Created/updated/retrieved entry data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('cognito-forms-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
