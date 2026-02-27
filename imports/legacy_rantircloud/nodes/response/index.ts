import { NodePlugin } from '@/types/node-plugin';
import { Send } from 'lucide-react';

export const responseNode: NodePlugin = {
  type: 'response',
  name: 'HTTP Response',
  description: 'Send a response back to the webhook caller. Use this to return data from your deployed flow.',
  category: 'action',
  icon: Send,
  color: '#6366F1',
  inputs: [
    {
      name: 'statusCode',
      label: 'Status Code',
      type: 'select',
      required: false,
      default: '200',
      options: [
        { label: '200 OK', value: '200', description: 'Successful request' },
        { label: '201 Created', value: '201', description: 'Resource created' },
        { label: '204 No Content', value: '204', description: 'Success with no body' },
        { label: '400 Bad Request', value: '400', description: 'Invalid request' },
        { label: '401 Unauthorized', value: '401', description: 'Authentication required' },
        { label: '403 Forbidden', value: '403', description: 'Access denied' },
        { label: '404 Not Found', value: '404', description: 'Resource not found' },
        { label: '500 Server Error', value: '500', description: 'Internal error' },
      ],
      description: 'HTTP status code for the response',
    },
    {
      name: 'body',
      label: 'Response Body',
      type: 'code',
      language: 'json',
      placeholder: '{\n  "success": true,\n  "message": "Hello World"\n}',
      description: 'JSON body to return. Use {{nodeId.output}} for dynamic values.',
    },
    {
      name: 'contentType',
      label: 'Content Type',
      type: 'select',
      required: false,
      default: 'application/json',
      options: [
        { label: 'JSON', value: 'application/json' },
        { label: 'Plain Text', value: 'text/plain' },
        { label: 'HTML', value: 'text/html' },
        { label: 'XML', value: 'application/xml' },
      ],
      description: 'Content-Type header for the response',
    },
    {
      name: 'customHeaders',
      label: 'Custom Headers',
      type: 'code',
      language: 'json',
      placeholder: '{\n  "X-Custom-Header": "value"\n}',
      description: 'Additional headers to include in the response',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if response was sent successfully. Use in Condition nodes to verify response.',
    },
    {
      name: 'statusCode',
      type: 'number',
      description: 'The status code that was sent',
    },
    {
      name: 'body',
      type: 'object',
      description: 'The response body that was sent',
    },
  ],
  execute: async (inputs) => {
    let parsedBody = inputs.body;
    let customHeaders = {};
    
    try {
      if (typeof inputs.body === 'string') {
        parsedBody = JSON.parse(inputs.body);
      }
    } catch {
      parsedBody = inputs.body;
    }
    
    try {
      if (typeof inputs.customHeaders === 'string') {
        customHeaders = JSON.parse(inputs.customHeaders);
      }
    } catch {
      customHeaders = {};
    }
    
    return {
      success: true, // Response configured successfully
      statusCode: parseInt(inputs.statusCode) || 200,
      body: parsedBody,
      headers: {
        'Content-Type': inputs.contentType || 'application/json',
        ...customHeaders,
      },
    };
  },
};
