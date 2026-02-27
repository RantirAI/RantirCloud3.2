
import { NodePlugin } from '@/types/node-plugin';
import { Globe } from 'lucide-react';

export const httpRequestNode: NodePlugin = {
  type: 'http-request',
  name: 'HTTP Request',
  description: 'Make HTTP requests to external APIs',
  category: 'action',
  icon: Globe,
  color: '#4CAF50',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: false,
      description: 'Optional API key for authentication',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'url',
      label: 'URL',
      type: 'text',
      required: true,
      description: 'The URL to send the request to',
      placeholder: 'https://api.example.com/data',
      dependsOnApiKey: false,
    },
    {
      name: 'method',
      label: 'Method',
      type: 'select',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
      description: 'HTTP method to use',
      dependsOnApiKey: false,
    },
    {
      name: 'headers',
      label: 'Headers',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "Content-Type": "application/json"\n}',
      description: 'HTTP headers to send with the request',
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "key": "value"\n}',
      description: 'Body to send with the request (for POST, PUT, PATCH)',
    }
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Returns true if request succeeded (status 2xx), false otherwise. Use in Condition nodes to route on success/failure.',
    },
    {
      name: 'response',
      type: 'object',
      description: 'The complete response object',
    },
    {
      name: 'data',
      type: 'object',
      description: 'The parsed response body',
    },
    {
      name: 'status',
      type: 'number',
      description: 'HTTP status code',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the request failed, null otherwise',
    }
  ],
  async execute(inputs, context) {
    const { url, method, headers, body, apiKey } = inputs;
    
    if (!url) {
      throw new Error('URL is required');
    }
    
    try {
      const requestHeaders = headers ? JSON.parse(headers) : {};
      
      // Add API key to headers if provided
      if (apiKey) {
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const options: RequestInit = {
        method: method || 'GET',
        headers: requestHeaders,
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        options.body = body;
      }
      
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => null);
      
      // Determine success based on HTTP status code (2xx = success)
      const isSuccess = response.status >= 200 && response.status < 300;
      
      return {
        success: isSuccess,
        response: {
          headers: Object.fromEntries(response.headers.entries()),
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
        data: responseData,
        status: response.status,
        error: isSuccess ? null : response.statusText || `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        response: null,
        data: null,
        status: 0,
        error: error.message || 'Request failed',
      };
    }
  }
};
