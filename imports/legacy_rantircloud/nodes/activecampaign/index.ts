import { NodePlugin } from '@/types/node-plugin';
import { Mail } from 'lucide-react';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const activecampaignNode: NodePlugin = {
  type: 'activecampaign',
  name: 'ActiveCampaign',
  description: 'Connect to ActiveCampaign for email marketing automation, contact management, and campaign tracking',
  category: 'action',
  icon: Mail,
  color: '#356AE6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your ActiveCampaign API key',
      isApiKey: true,
    },
    {
      name: 'baseUrl',
      label: 'Base URL',
      type: 'text',
      required: true,
      description: 'Your ActiveCampaign base URL (e.g., https://youraccount.api-us1.com)',
      placeholder: 'https://youraccount.api-us1.com',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Contact to Account', value: 'add_contact_to_account', description: 'Add a contact to an account' },
        { label: 'Add Tag to Contact', value: 'add_tag', description: 'Add a tag to a contact' },
        { label: 'Create Account', value: 'create_account', description: 'Create a new account' },
        { label: 'Create Contact', value: 'create_contact', description: 'Create a new contact' },
        { label: 'Update Account', value: 'update_account', description: 'Update an existing account' },
        { label: 'Update Contact', value: 'update_contact', description: 'Update an existing contact' },
        { label: 'Subscribe or Unsubscribe Contact From List', value: 'subscribe_unsubscribe_list', description: 'Subscribe or unsubscribe contact from a list' },
      ],
      description: 'Choose the ActiveCampaign action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'add_contact_to_account':
        dynamicInputs.push(
          {
            name: 'contactId',
            label: 'Contact ID',
            type: 'text',
            required: true,
            description: 'ID of the contact to add to account',
          },
          {
            name: 'accountId',
            label: 'Account ID',
            type: 'text',
            required: true,
            description: 'ID of the account',
          }
        );
        break;

      case 'add_tag':
        dynamicInputs.push(
          {
            name: 'contactId',
            label: 'Contact ID',
            type: 'text',
            required: true,
            description: 'ID of the contact',
          },
          {
            name: 'tagId',
            label: 'Tag ID',
            type: 'text',
            required: true,
            description: 'ID of the tag',
          }
        );
        break;

      case 'create_account':
        dynamicInputs.push(
          {
            name: 'name',
            label: 'Account Name',
            type: 'text',
            required: true,
            description: 'Name of the account',
          },
          {
            name: 'accountUrl',
            label: 'Account URL',
            type: 'text',
            required: false,
            description: 'Website URL of the account',
          }
        );
        break;

      case 'create_contact':
        dynamicInputs.push(
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Contact email address',
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: false,
            description: 'Contact first name',
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: false,
            description: 'Contact last name',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Contact phone number',
          }
        );
        break;

      case 'update_account':
        dynamicInputs.push(
          {
            name: 'accountId',
            label: 'Account ID',
            type: 'text',
            required: true,
            description: 'ID of the account to update',
          },
          {
            name: 'name',
            label: 'Account Name',
            type: 'text',
            required: false,
            description: 'Updated name of the account',
          },
          {
            name: 'accountUrl',
            label: 'Account URL',
            type: 'text',
            required: false,
            description: 'Updated website URL of the account',
          }
        );
        break;

      case 'update_contact':
        dynamicInputs.push(
          {
            name: 'contactId',
            label: 'Contact ID',
            type: 'text',
            required: true,
            description: 'ID of the contact to update',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: false,
            description: 'Contact email address',
          },
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: false,
            description: 'Contact first name',
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: false,
            description: 'Contact last name',
          },
          {
            name: 'phone',
            label: 'Phone',
            type: 'text',
            required: false,
            description: 'Contact phone number',
          }
        );
        break;

      case 'subscribe_unsubscribe_list':
        dynamicInputs.push(
          {
            name: 'contactId',
            label: 'Contact ID',
            type: 'text',
            required: true,
            description: 'ID of the contact',
          },
          {
            name: 'listId',
            label: 'List ID',
            type: 'text',
            required: true,
            description: 'ID of the list',
          },
          {
            name: 'subscriptionStatus',
            label: 'Subscription Status',
            type: 'select',
            required: true,
            options: [
              { label: 'Subscribe', value: 'subscribe', description: 'Subscribe contact to list' },
              { label: 'Unsubscribe', value: 'unsubscribe', description: 'Unsubscribe contact from list' },
            ],
            description: 'Whether to subscribe or unsubscribe the contact',
          }
        );
        break;
    }

    return dynamicInputs;
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
      description: 'The response data from ActiveCampaign',
    },
    {
      name: 'contactId',
      type: 'string',
      description: 'ID of the contact (for contact operations)',
    },
    {
      name: 'accountId',
      type: 'string',
      description: 'ID of the account (for account operations)',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { apiKey, baseUrl, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedApiKey = resolveVariable(apiKey);
    const resolvedBaseUrl = resolveVariable(baseUrl);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedApiKey) {
      throw new Error('ActiveCampaign API key is required');
    }

    if (!resolvedBaseUrl) {
      throw new Error('ActiveCampaign base URL is required');
    }

    try {
      // Use Supabase proxy function for ActiveCampaign API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('activecampaign-proxy', {
        body: {
          apiKey: resolvedApiKey,
          baseUrl: resolvedBaseUrl,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`ActiveCampaign proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        contactId: null,
        accountId: null,
        error: error.message,
      };
    }
  },
};