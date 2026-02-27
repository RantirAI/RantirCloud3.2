import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const beehiivNode: NodePlugin = {
  type: 'beehiiv',
  name: 'Beehiiv',
  description: 'Manage newsletter subscriptions and campaigns',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/beehiiv.png',
  color: '#FFB800',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Beehiiv API key',
      isApiKey: true,
    },
    {
      name: 'publicationId',
      label: 'Publication ID',
      type: 'text',
      required: true,
      description: 'Your Beehiiv publication ID',
      dependsOnApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Subscription', value: 'createSubscription' },
        { label: 'Update Subscription', value: 'updateSubscription' },
        { label: 'Add Subscription to Automation', value: 'addSubscriptionToAutomation' },
        { label: 'List Automations', value: 'listAutomations' },
        { label: 'List Posts', value: 'listPosts' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'createSubscription') {
      inputs.push(
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: true,
          description: 'Subscriber email address',
        },
        {
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: false,
        },
        {
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: false,
        }
      );
    } else if (currentInputs.action === 'updateSubscription') {
      inputs.push(
        {
          name: 'subscriptionId',
          label: 'Subscription ID',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          label: 'Email',
          type: 'text',
          required: false,
        },
        {
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: false,
        },
        {
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: false,
        }
      );
    } else if (currentInputs.action === 'addSubscriptionToAutomation') {
      inputs.push(
        {
          name: 'subscriptionId',
          label: 'Subscription ID',
          type: 'text',
          required: true,
        },
        {
          name: 'automationId',
          label: 'Automation ID',
          type: 'text',
          required: true,
        }
      );
    } else if (currentInputs.action === 'createCustomApiCall') {
      inputs.push(
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path',
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
          ],
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON request body',
        }
      );
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
      description: 'Response data from Beehiiv',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('beehiiv-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
