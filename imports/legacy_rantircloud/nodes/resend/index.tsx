import React from 'react';
import { NodePlugin } from '@/types/node-plugin';

const ResendIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 1800" fill="none" className={className} style={style}>
    <path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" fill="currentColor"/>
  </svg>
);

export const resendNode: NodePlugin = {
  type: 'resend',
  name: 'Resend',
  description: 'Send transactional emails using Resend API',
  category: 'action',
  icon: ResendIcon,
  color: '#000000',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Resend API key (starts with re_)',
      placeholder: 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Email', value: 'send_email', description: 'Send a single email' },
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call to Resend' },
      ],
      description: 'Choose the Resend operation to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const contentType = currentInputs?.contentType;
    const dynamicInputs = [];

    if (action === 'send_email') {
      dynamicInputs.push(
        {
          name: 'from',
          label: 'From',
          type: 'text',
          required: true,
          description: 'Sender email address (must be from a verified domain)',
          placeholder: 'you@yourdomain.com',
        },
        {
          name: 'fromName',
          label: 'From Name',
          type: 'text',
          required: false,
          description: 'Sender display name',
          placeholder: 'Your Name',
        },
        {
          name: 'to',
          label: 'To',
          type: 'text',
          required: true,
          description: 'Recipient email address(es), comma-separated for multiple',
          placeholder: 'recipient@example.com',
        },
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
          description: 'Email subject line',
          placeholder: 'Your email subject',
        },
        {
          name: 'contentType',
          label: 'Content Type',
          type: 'select',
          required: true,
          default: 'html',
          options: [
            { label: 'HTML', value: 'html' },
            { label: 'Plain Text', value: 'text' },
          ],
          description: 'Type of email content',
        }
      );

      // Add content field based on content type selection
      if (contentType === 'text') {
        dynamicInputs.push({
          name: 'content',
          label: 'Email Content',
          type: 'textarea',
          required: true,
          description: 'Plain text content of the email',
          placeholder: 'Hello! This is your email content.',
        });
      } else {
        dynamicInputs.push({
          name: 'content',
          label: 'Email Content',
          type: 'code',
          language: 'html',
          required: true,
          description: 'HTML content of the email',
          placeholder: '<h1>Hello!</h1><p>This is your email content.</p>',
        });
      }

      dynamicInputs.push(
        {
          name: 'cc',
          label: 'CC',
          type: 'text',
          required: false,
          description: 'CC recipients (comma-separated)',
          placeholder: 'cc@example.com',
        },
        {
          name: 'bcc',
          label: 'BCC',
          type: 'text',
          required: false,
          description: 'BCC recipients (comma-separated)',
          placeholder: 'bcc@example.com',
        },
        {
          name: 'replyTo',
          label: 'Reply-To',
          type: 'text',
          required: false,
          description: 'Reply-to email address',
          placeholder: 'replies@example.com',
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Custom tags as JSON array of objects: [{"name": "category", "value": "newsletter"}]',
          placeholder: '[{"name": "category", "value": "newsletter"}]',
        }
      );
    }

    if (action === 'custom_api_call') {
      dynamicInputs.push(
        {
          name: 'endpoint',
          label: 'API Endpoint',
          type: 'text',
          required: true,
          description: 'Resend API endpoint (e.g., /emails, /domains)',
          placeholder: '/emails',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          default: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
          description: 'HTTP method for the request',
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON request body (for POST, PUT, PATCH)',
          placeholder: '{\n  "key": "value"\n}',
        }
      );
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
      name: 'id',
      type: 'string',
      description: 'Email ID for sent email',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Full response data from Resend',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { 
      action,
      apiKey,
      from,
      fromName,
      to,
      subject,
      contentType,
      content,
      cc,
      bcc,
      replyTo,
      tags,
      endpoint,
      method,
      body
    } = inputs;

    if (!apiKey) {
      throw new Error('Resend API key is required');
    }

    try {
      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Resend.');
      }

      const requestData = {
        action,
        apiKey,
        from,
        fromName,
        to,
        subject,
        contentType,
        content,
        cc,
        bcc,
        replyTo,
        tags,
        endpoint,
        method,
        requestBody: body,
      };

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/resend-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        id: result.id,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        id: null,
        data: null,
        error: error.message,
      };
    }
  },
};
