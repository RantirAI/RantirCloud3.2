import { NodePlugin } from '@/types/node-plugin';

export const gmailNode: NodePlugin = {
  type: 'gmail',
  name: 'Gmail',
  description: 'Send emails and manage Gmail messages using Gmail API',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/gmail.png',
  color: '#EA4335',
  inputs: [
    {
      name: 'accessToken',
      label: 'OAuth Access Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Gmail OAuth 2.0 access token',
      placeholder: 'Enter your Gmail OAuth access token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Email', value: 'gmailSendEmail' },
        { label: 'Custom API Call', value: 'customApiCall' }
      ],
      description: 'Choose the Gmail action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'gmailSendEmail':
        dynamicInputs.push(
          {
            name: 'senderName',
            label: 'Sender Name',
            type: 'text',
            required: true,
            description: 'Name displayed as the sender',
            placeholder: 'Your Name'
          },
          {
            name: 'senderEmail',
            label: 'Sender Email',
            type: 'text',
            required: true,
            description: 'Email address to send from',
            placeholder: 'sender@example.com'
          },
          {
            name: 'to',
            label: 'To',
            type: 'text',
            required: true,
            description: 'Recipient email address',
            placeholder: 'recipient@example.com'
          },
          {
            name: 'subject',
            label: 'Subject',
            type: 'text',
            required: true,
            description: 'Email subject line'
          },
          {
            name: 'body',
            label: 'Body',
            type: 'textarea',
            required: true,
            description: 'Email body content (plain text or HTML)'
          },
          {
            name: 'cc',
            label: 'CC',
            type: 'text',
            required: false,
            description: 'CC recipients (comma-separated)',
            placeholder: 'cc1@example.com, cc2@example.com'
          },
          {
            name: 'bcc',
            label: 'BCC',
            type: 'text',
            required: false,
            description: 'BCC recipients (comma-separated)',
            placeholder: 'bcc1@example.com, bcc2@example.com'
          }
        );
        break;

      case 'customApiCall':
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
            description: 'API endpoint path (e.g., /users/me/messages)',
            placeholder: '/users/me/messages'
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
            placeholder: '{"maxResults": 10, "q": "is:unread"}'
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
      description: 'The result of the Gmail operation'
    },
    {
      name: 'messageId',
      type: 'string',
      description: 'ID of the sent message'
    }
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data, error } = await supabase.functions.invoke('gmail-proxy', {
        body: inputs
      });

      if (error) {
        throw new Error(`Gmail proxy error: ${error.message}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      throw new Error(`Gmail operation failed: ${error.message}`);
    }
  }
};
