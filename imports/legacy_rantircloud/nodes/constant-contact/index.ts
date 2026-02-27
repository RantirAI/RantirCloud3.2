import { NodePlugin } from '@/types/node-plugin';

export const constantContactNode: NodePlugin = {
  type: 'constant-contact',
  name: 'Constant Contact',
  description: 'Email marketing and automation platform for creating campaigns and managing contacts.',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/constant-contact.png',
  color: '#0070C0',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Constant Contact API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create or Update Contact', value: 'createOrUpdateContact', description: 'Create a new contact or update an existing one' },
        { label: 'Custom API Call', value: 'customApiCall', description: 'Make a custom API call to Constant Contact' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createOrUpdateContact') {
      inputs.push(
        { name: 'email', label: 'Email', type: 'text' as const, required: true, description: 'Contact email address', placeholder: 'contact@example.com' },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false, description: 'Contact first name' },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false, description: 'Contact last name' },
        { name: 'listId', label: 'List ID', type: 'text' as const, required: false, description: 'The ID of the contact list to add the contact to' }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'The API endpoint to call' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    {
      name: 'contactId',
      type: 'string',
      description: 'The ID of the created or updated contact',
    },
    {
      name: 'data',
      type: 'object',
      description: 'The full API response',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('constant-contact-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
