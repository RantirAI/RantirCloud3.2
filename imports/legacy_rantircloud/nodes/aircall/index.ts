import { NodePlugin } from '@/types/node-plugin';

export const aircallNode: NodePlugin = {
  type: 'aircall',
  name: 'Aircall',
  description: 'Cloud-based phone system for sales and support teams',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/aircall.png',
  color: '#00D4AA',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Aircall API key'
    },
    {
      name: 'apiId',
      label: 'API ID',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Aircall API ID'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Tag a Call', value: 'tag_call', description: 'Add a tag to a call' },
        { label: 'Comment a Call', value: 'comment_call', description: 'Add a comment to a call' },
        { label: 'Create a Contact', value: 'create_contact', description: 'Create a new contact' },
        { label: 'Find Call', value: 'find_call', description: 'Find a specific call' },
        { label: 'Find Contact', value: 'find_contact', description: 'Find a specific contact' },
        { label: 'Get Call', value: 'get_call', description: 'Get details of a specific call' },
        { label: 'Update Contact', value: 'update_contact', description: 'Update an existing contact' },
      ],
      description: 'Select the Aircall action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'tag_call':
        dynamicInputs.push(
          {
            name: 'call_id',
            label: 'Call ID',
            type: 'text',
            required: true,
            description: 'ID of the call to tag',
          },
          {
            name: 'tag_id',
            label: 'Tag ID',
            type: 'text',
            required: true,
            description: 'ID of the tag to add',
          }
        );
        break;

      case 'comment_call':
        dynamicInputs.push(
          {
            name: 'call_id',
            label: 'Call ID',
            type: 'text',
            required: true,
            description: 'ID of the call to comment on',
          },
          {
            name: 'content',
            label: 'Comment',
            type: 'textarea',
            required: true,
            description: 'Comment content',
            placeholder: 'Add your comment here...',
          }
        );
        break;

      case 'create_contact':
        dynamicInputs.push(
          {
            name: 'first_name',
            label: 'First Name',
            type: 'text',
            required: true,
            description: 'Contact first name',
          },
          {
            name: 'last_name',
            label: 'Last Name',
            type: 'text',
            required: true,
            description: 'Contact last name',
          },
          {
            name: 'phone_numbers',
            label: 'Phone Numbers',
            type: 'code',
            language: 'json',
            required: true,
            description: 'Array of phone numbers in JSON format',
            placeholder: '[{"label": "Work", "value": "+1234567890"}]',
          },
          {
            name: 'emails',
            label: 'Emails',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Array of emails in JSON format',
            placeholder: '[{"label": "Work", "value": "email@example.com"}]',
          },
          {
            name: 'company_name',
            label: 'Company Name',
            type: 'text',
            required: false,
            description: 'Company name',
          }
        );
        break;

      case 'find_call':
        dynamicInputs.push(
          {
            name: 'call_id',
            label: 'Call ID',
            type: 'text',
            required: false,
            description: 'Specific call ID to find',
          },
          {
            name: 'phone_number',
            label: 'Phone Number',
            type: 'text',
            required: false,
            description: 'Phone number to search calls',
          },
          {
            name: 'from_date',
            label: 'From Date',
            type: 'text',
            required: false,
            description: 'Start date for search (ISO 8601)',
            placeholder: '2024-01-01T00:00:00Z',
          },
          {
            name: 'to_date',
            label: 'To Date',
            type: 'text',
            required: false,
            description: 'End date for search (ISO 8601)',
            placeholder: '2024-12-31T23:59:59Z',
          }
        );
        break;

      case 'find_contact':
        dynamicInputs.push(
          {
            name: 'contact_id',
            label: 'Contact ID',
            type: 'text',
            required: false,
            description: 'Specific contact ID to find',
          },
          {
            name: 'phone_number',
            label: 'Phone Number',
            type: 'text',
            required: false,
            description: 'Phone number to search contacts',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            required: false,
            description: 'Email to search contacts',
          },
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: false,
            description: 'Name to search contacts',
          }
        );
        break;

      case 'get_call':
        dynamicInputs.push({
          name: 'call_id',
          label: 'Call ID',
          type: 'text',
          required: true,
          description: 'ID of the call to retrieve',
        });
        break;

      case 'update_contact':
        dynamicInputs.push(
          {
            name: 'contact_id',
            label: 'Contact ID',
            type: 'text',
            required: true,
            description: 'ID of the contact to update',
          },
          {
            name: 'first_name',
            label: 'First Name',
            type: 'text',
            required: false,
            description: 'Updated first name',
          },
          {
            name: 'last_name',
            label: 'Last Name',
            type: 'text',
            required: false,
            description: 'Updated last name',
          },
          {
            name: 'phone_numbers',
            label: 'Phone Numbers',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Updated array of phone numbers in JSON format',
            placeholder: '[{"label": "Work", "value": "+1234567890"}]',
          },
          {
            name: 'emails',
            label: 'Emails',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Updated array of emails in JSON format',
            placeholder: '[{"label": "Work", "value": "email@example.com"}]',
          },
          {
            name: 'company_name',
            label: 'Company Name',
            type: 'text',
            required: false,
            description: 'Updated company name',
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
      description: 'Whether the operation was successful'
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Aircall'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    }
  ],
  execute: async (inputs, context) => {
    const { apiKey, apiId, action, ...actionInputs } = inputs;

    if (!apiKey || !apiId) {
      throw new Error('API Key and API ID are required');
    }

    const baseUrl = 'https://api.aircall.io/v1';
    const auth = Buffer.from(`${apiId}:${apiKey}`).toString('base64');

    try {
      let url = '';
      let method = 'GET';
      let body = null;

      switch (action) {
        case 'tag_call':
          url = `${baseUrl}/calls/${actionInputs.call_id}/tags`;
          method = 'POST';
          body = JSON.stringify({ tag_id: actionInputs.tag_id });
          break;

        case 'comment_call':
          url = `${baseUrl}/calls/${actionInputs.call_id}/comments`;
          method = 'POST';
          body = JSON.stringify({ content: actionInputs.content });
          break;

        case 'create_contact':
          url = `${baseUrl}/contacts`;
          method = 'POST';
          body = JSON.stringify({
            first_name: actionInputs.first_name,
            last_name: actionInputs.last_name,
            phone_numbers: JSON.parse(actionInputs.phone_numbers || '[]'),
            emails: actionInputs.emails ? JSON.parse(actionInputs.emails) : [],
            company_name: actionInputs.company_name
          });
          break;

        case 'find_call':
          const findCallParams = new URLSearchParams();
          if (actionInputs.call_id) {
            url = `${baseUrl}/calls/${actionInputs.call_id}`;
          } else {
            if (actionInputs.phone_number) findCallParams.append('phone_number', actionInputs.phone_number);
            if (actionInputs.from_date) findCallParams.append('from', actionInputs.from_date);
            if (actionInputs.to_date) findCallParams.append('to', actionInputs.to_date);
            url = `${baseUrl}/calls${findCallParams.toString() ? '?' + findCallParams.toString() : ''}`;
          }
          break;

        case 'find_contact':
          if (actionInputs.contact_id) {
            url = `${baseUrl}/contacts/${actionInputs.contact_id}`;
          } else {
            const findContactParams = new URLSearchParams();
            if (actionInputs.phone_number) findContactParams.append('phone_number', actionInputs.phone_number);
            if (actionInputs.email) findContactParams.append('email', actionInputs.email);
            if (actionInputs.name) findContactParams.append('name', actionInputs.name);
            url = `${baseUrl}/contacts/search${findContactParams.toString() ? '?' + findContactParams.toString() : ''}`;
          }
          break;

        case 'get_call':
          url = `${baseUrl}/calls/${actionInputs.call_id}`;
          break;

        case 'update_contact':
          url = `${baseUrl}/contacts/${actionInputs.contact_id}`;
          method = 'PUT';
          const updateData: any = {};
          if (actionInputs.first_name) updateData.first_name = actionInputs.first_name;
          if (actionInputs.last_name) updateData.last_name = actionInputs.last_name;
          if (actionInputs.phone_numbers) updateData.phone_numbers = JSON.parse(actionInputs.phone_numbers);
          if (actionInputs.emails) updateData.emails = JSON.parse(actionInputs.emails);
          if (actionInputs.company_name) updateData.company_name = actionInputs.company_name;
          body = JSON.stringify(updateData);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Use Supabase proxy function for Aircall API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('aircall-proxy', {
        body: {
          apiId,
          apiToken: apiKey,
          action,
          ...actionInputs
        }
      });

      if (error) {
        throw new Error(`Aircall proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
};