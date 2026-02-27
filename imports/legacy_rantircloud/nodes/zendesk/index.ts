import { NodePlugin } from '@/types/node-plugin';

export const zendeskNode: NodePlugin = {
  type: 'zendesk',
  name: 'Zendesk',
  description: 'Create and manage Zendesk tickets and users',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/zendesk.png',
  color: '#03363D',
  inputs: [
    {
      name: 'subdomain',
      label: 'Zendesk Subdomain',
      type: 'text',
      required: true,
      description: 'Your Zendesk subdomain (e.g., "yourcompany" for yourcompany.zendesk.com)',
      placeholder: 'yourcompany'
    },
    {
      name: 'email',
      label: 'Admin Email',
      type: 'text',
      required: true,
      description: 'Your Zendesk admin email address'
    },
    {
      name: 'apiToken',
      label: 'API Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Zendesk API token',
      placeholder: 'Enter your Zendesk API token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Ticket', value: 'createTicket' },
        { label: 'Update Ticket', value: 'updateTicket' },
        { label: 'Add Tag to Ticket', value: 'addTagToTicket' },
        { label: 'Add Comment to Ticket', value: 'addCommentToTicket' },
        { label: 'Create Organization', value: 'createOrganization' },
        { label: 'Update Organization', value: 'updateOrganization' },
        { label: 'Create User', value: 'createUser' },
        { label: 'Delete User', value: 'deleteUser' },
        { label: 'Find Organization', value: 'findOrganization' },
        { label: 'Find Tickets', value: 'findTickets' },
        { label: 'Find User', value: 'findUser' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' }
      ],
      description: 'Choose the Zendesk action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'createTicket':
        dynamicInputs.push(
          {
            name: 'subject',
            label: 'Subject',
            type: 'text',
            required: true,
            description: 'Ticket subject'
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            required: true,
            description: 'Ticket description'
          },
          {
            name: 'requesterEmail',
            label: 'Requester Email',
            type: 'text',
            required: false,
            description: 'Email of the requester'
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: false,
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'High', value: 'high' },
              { label: 'Urgent', value: 'urgent' }
            ],
            description: 'Ticket priority'
          }
        );
        break;

      case 'updateTicket':
        dynamicInputs.push(
          {
            name: 'ticketId',
            label: 'Ticket ID',
            type: 'text',
            required: true,
            description: 'ID of the ticket to update'
          },
          {
            name: 'subject',
            label: 'Subject',
            type: 'text',
            required: false,
            description: 'New ticket subject'
          },
          {
            name: 'comment',
            label: 'Comment',
            type: 'textarea',
            required: false,
            description: 'Add a comment to the ticket'
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: false,
            options: [
              { label: 'New', value: 'new' },
              { label: 'Open', value: 'open' },
              { label: 'Pending', value: 'pending' },
              { label: 'Hold', value: 'hold' },
              { label: 'Solved', value: 'solved' },
              { label: 'Closed', value: 'closed' }
            ],
            description: 'Ticket status'
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: false,
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'High', value: 'high' },
              { label: 'Urgent', value: 'urgent' }
            ],
            description: 'Ticket priority'
          }
        );
        break;

      case 'addTagToTicket':
        dynamicInputs.push(
          {
            name: 'ticketId',
            label: 'Ticket ID',
            type: 'text',
            required: true,
            description: 'ID of the ticket'
          },
          {
            name: 'tags',
            label: 'Tags',
            type: 'text',
            required: true,
            description: 'Comma-separated tags to add',
            placeholder: 'tag1, tag2, tag3'
          }
        );
        break;

      case 'addCommentToTicket':
        dynamicInputs.push(
          {
            name: 'ticketId',
            label: 'Ticket ID',
            type: 'text',
            required: true,
            description: 'ID of the ticket'
          },
          {
            name: 'comment',
            label: 'Comment',
            type: 'textarea',
            required: true,
            description: 'Comment body'
          },
          {
            name: 'public',
            label: 'Public Comment',
            type: 'boolean',
            required: false,
            default: true,
            description: 'Whether the comment is public'
          }
        );
        break;

      case 'createOrganization':
        dynamicInputs.push(
          {
            name: 'name',
            label: 'Organization Name',
            type: 'text',
            required: true,
            description: 'Name of the organization'
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            required: false,
            description: 'Additional notes'
          }
        );
        break;

      case 'updateOrganization':
        dynamicInputs.push(
          {
            name: 'organizationId',
            label: 'Organization ID',
            type: 'text',
            required: true,
            description: 'ID of the organization'
          },
          {
            name: 'name',
            label: 'Organization Name',
            type: 'text',
            required: false,
            description: 'New organization name'
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            required: false,
            description: 'Additional notes'
          }
        );
        break;

      case 'createUser':
        dynamicInputs.push(
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            description: 'User name'
          },
          {
            name: 'userEmail',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'User email address'
          },
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            required: false,
            options: [
              { label: 'End User', value: 'end-user' },
              { label: 'Agent', value: 'agent' },
              { label: 'Admin', value: 'admin' }
            ],
            description: 'User role'
          }
        );
        break;

      case 'deleteUser':
        dynamicInputs.push(
          {
            name: 'userId',
            label: 'User ID',
            type: 'text',
            required: true,
            description: 'ID of the user to delete'
          }
        );
        break;

      case 'findOrganization':
        dynamicInputs.push(
          {
            name: 'organizationName',
            label: 'Organization Name',
            type: 'text',
            required: true,
            description: 'Name of the organization to search for'
          }
        );
        break;

      case 'findTickets':
        dynamicInputs.push(
          {
            name: 'query',
            label: 'Search Query',
            type: 'text',
            required: false,
            description: 'Search query for tickets',
            placeholder: 'status:open priority:high'
          },
          {
            name: 'sortBy',
            label: 'Sort By',
            type: 'select',
            required: false,
            options: [
              { label: 'Created At', value: 'created_at' },
              { label: 'Updated At', value: 'updated_at' },
              { label: 'Priority', value: 'priority' },
              { label: 'Status', value: 'status' }
            ],
            description: 'Field to sort by'
          }
        );
        break;

      case 'findUser':
        dynamicInputs.push(
          {
            name: 'searchEmail',
            label: 'Email',
            type: 'text',
            required: true,
            description: 'Email of the user to search for'
          }
        );
        break;

      case 'createCustomApiCall':
        dynamicInputs.push(
          {
            name: 'method',
            label: 'HTTP Method',
            type: 'select',
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' }
            ],
            description: 'HTTP method for the API call'
          },
          {
            name: 'endpoint',
            label: 'Endpoint',
            type: 'text',
            required: true,
            description: 'API endpoint path (e.g., /api/v2/tickets.json)',
            placeholder: '/api/v2/tickets.json'
          },
          {
            name: 'body',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body for POST/PUT/PATCH requests'
          },
          {
            name: 'queryParams',
            label: 'Query Parameters',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Query parameters as JSON object',
            placeholder: '{"sort_by": "created_at", "sort_order": "desc"}'
          }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'The result of the Zendesk operation'
    },
    {
      name: 'ticketId',
      type: 'number',
      description: 'The created or updated ticket ID'
    },
    {
      name: 'ticketUrl',
      type: 'string',
      description: 'Direct URL to the ticket'
    }
  ],
  async execute(inputs, context) {
    let { subdomain, email, apiToken, action } = inputs;
    
    if (!subdomain || !email || !apiToken) {
      throw new Error('Zendesk subdomain, email, and API token are required');
    }

    // Sanitize credentials
    subdomain = subdomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/\.zendesk\.com.*$/, '');  // Remove .zendesk.com and everything after
    
    // Validate subdomain format
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      throw new Error('Invalid subdomain format. Use only your subdomain (e.g., "yourcompany", not "yourcompany.zendesk.com")');
    }
    
    email = email.trim();
    apiToken = apiToken.trim();

    // Map node action names to edge function action names
    const actionMap: Record<string, string> = {
      'addTagToTicket': 'addTags',
      'addCommentToTicket': 'addComment',
      'findTickets': 'searchTickets',
      'createCustomApiCall': 'customApiCall'
    };
    
    const mappedAction = actionMap[action] || action;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('zendesk-proxy', {
        body: {
          subdomain,
          email,
          apiToken,
          action: mappedAction,
          inputs
        }
      });

      if (error) {
        throw new Error(`Failed to call Zendesk API: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`Zendesk operation failed: ${error.message}`);
    }
  }
};