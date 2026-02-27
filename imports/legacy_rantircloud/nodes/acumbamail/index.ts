import { NodePlugin } from '@/types/node-plugin';

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

export const acumbamailNode: NodePlugin = {
  type: 'acumbamail',
  name: 'Acumbamail',
  description: 'Connect to Acumbamail for email marketing campaigns, subscriber management, and automation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/acumbamail.png',
  color: '#4A90E2',
  inputs: [
    {
      name: 'authToken',
      label: 'Auth Token',
      type: 'text',
      required: true,
      description: 'Your Acumbamail authentication token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add/Update Subscriber', value: 'add_update_subscriber', description: 'Add or update subscriber in a list' },
        { label: 'Create Subscriber List', value: 'create_list', description: 'Create a new subscriber list' },
        { label: 'Unsubscribe Subscriber', value: 'unsubscribe_subscriber', description: 'Unsubscribe subscriber from list' },
        { label: 'Delete Subscriber List', value: 'delete_list', description: 'Delete a subscriber list' },
        { label: 'Duplicate Template', value: 'duplicate_template', description: 'Duplicate an email template' },
        { label: 'Search Subscriber', value: 'search_subscriber', description: 'Search for a subscriber' },
        { label: 'Remove Subscriber', value: 'remove_subscriber', description: 'Remove subscriber from list' },
      ],
      description: 'Choose the Acumbamail action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'add_update_subscriber':
        dynamicInputs.push(
          {
            name: 'listId',
            label: 'List ID',
            type: 'text',
            required: true,
            description: 'ID of the list to add/update subscriber',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Subscriber email address',
          },
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: false,
            description: 'Subscriber name',
          },
          {
            name: 'merge_fields',
            label: 'Merge Fields',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Additional subscriber fields as JSON',
            placeholder: '{\n  "FNAME": "John",\n  "LNAME": "Doe"\n}',
          },
          {
            name: 'doubleOptin',
            label: 'Double Opt-in',
            type: 'select',
            required: false,
            options: [
              { label: 'Yes', value: '1' },
              { label: 'No', value: '0' },
            ],
            description: 'Require double opt-in confirmation',
            default: '1',
          }
        );
        break;

      case 'create_list':
        dynamicInputs.push(
          {
            name: 'name',
            label: 'List Name',
            type: 'text',
            required: true,
            description: 'Name of the new list',
          },
          {
            name: 'senderName',
            label: 'Sender Name',
            type: 'text',
            required: true,
            description: 'Default sender name for this list',
          },
          {
            name: 'senderEmail',
            label: 'Sender Email',
            type: 'text',
            required: true,
            description: 'Default sender email for this list',
          },
          {
            name: 'description',
            label: 'Description',
            type: 'text',
            required: false,
            description: 'List description',
          }
        );
        break;

      case 'unsubscribe_subscriber':
        dynamicInputs.push(
          {
            name: 'listId',
            label: 'List ID',
            type: 'text',
            required: true,
            description: 'ID of the list',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Email address of the subscriber to unsubscribe',
          }
        );
        break;

      case 'delete_list':
        dynamicInputs.push({
          name: 'listId',
          label: 'List ID',
          type: 'text',
          required: true,
          description: 'ID of the list to delete',
        });
        break;

      case 'duplicate_template':
        dynamicInputs.push(
          {
            name: 'templateId',
            label: 'Template ID',
            type: 'text',
            required: true,
            description: 'ID of the template to duplicate',
          },
          {
            name: 'newName',
            label: 'New Template Name',
            type: 'text',
            required: true,
            description: 'Name for the duplicated template',
          }
        );
        break;

      case 'search_subscriber':
        dynamicInputs.push(
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: false,
            description: 'Search by email address',
          },
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: false,
            description: 'Search by subscriber name',
          },
          {
            name: 'listId',
            label: 'List ID',
            type: 'text',
            required: false,
            description: 'Search within specific list',
          }
        );
        break;

      case 'remove_subscriber':
        dynamicInputs.push(
          {
            name: 'listId',
            label: 'List ID',
            type: 'text',
            required: true,
            description: 'ID of the list',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Email address of the subscriber to remove',
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
      description: 'The response data from Acumbamail',
    },
    {
      name: 'lists',
      type: 'array',
      description: 'List of subscriber lists (for get_lists action)',
    },
    {
      name: 'subscribers',
      type: 'array',
      description: 'List of subscribers (for get_subscribers action)',
    },
    {
      name: 'campaigns',
      type: 'array',
      description: 'List of campaigns (for get_campaigns action)',
    },
    {
      name: 'campaignId',
      type: 'string',
      description: 'ID of created campaign',
    },
    {
      name: 'listId',
      type: 'string',
      description: 'ID of created list',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { authToken, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedAuthToken = resolveVariable(authToken);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedAuthToken) {
      throw new Error('Acumbamail auth token is required');
    }

    try {
      const baseUrl = 'https://acumbamail.com/api/1';
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;

      switch (action) {
        case 'add_update_subscriber':
          endpoint = `/addSubscriber/${resolvedInputs.listId}/`;
          method = 'POST';
          requestBody = {
            email: resolvedInputs.email,
            name: resolvedInputs.name || '',
            double_optin: resolvedInputs.doubleOptin || '1',
          };
          if (resolvedInputs.merge_fields) {
            try {
              const mergeFields = JSON.parse(resolvedInputs.merge_fields);
              requestBody.merge_fields = mergeFields;
            } catch (e) {
              throw new Error('Invalid JSON in merge fields');
            }
          }
          break;

        case 'create_list':
          endpoint = '/createList/';
          method = 'POST';
          requestBody = {
            name: resolvedInputs.name,
            sender_name: resolvedInputs.senderName,
            sender_email: resolvedInputs.senderEmail,
            description: resolvedInputs.description || '',
          };
          break;

        case 'unsubscribe_subscriber':
          endpoint = `/unsubscribeSubscriber/${resolvedInputs.listId}/`;
          method = 'POST';
          requestBody = {
            email: resolvedInputs.email,
          };
          break;

        case 'delete_list':
          endpoint = `/deleteList/${resolvedInputs.listId}/`;
          method = 'DELETE';
          break;

        case 'duplicate_template':
          endpoint = `/duplicateTemplate/${resolvedInputs.templateId}/`;
          method = 'POST';
          requestBody = {
            name: resolvedInputs.newName,
          };
          break;

        case 'search_subscriber':
          endpoint = '/searchSubscriber/';
          const params = new URLSearchParams();
          if (resolvedInputs.email) params.append('email', resolvedInputs.email);
          if (resolvedInputs.name) params.append('name', resolvedInputs.name);
          if (resolvedInputs.listId) params.append('list_id', resolvedInputs.listId);
          if (params.toString()) endpoint += `?${params.toString()}`;
          break;

        case 'remove_subscriber':
          endpoint = `/removeSubscriber/${resolvedInputs.listId}/`;
          method = 'POST';
          requestBody = {
            email: resolvedInputs.email,
          };
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for Acumbamail API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('acumbamail-proxy', {
        body: {
          apiKey: resolvedAuthToken,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Acumbamail proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        lists: null,
        subscribers: null,
        campaigns: null,
        campaignId: null,
        listId: null,
        error: error.message,
      };
    }
  },
};