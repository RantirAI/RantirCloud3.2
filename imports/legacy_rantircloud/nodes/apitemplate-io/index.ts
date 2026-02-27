import { NodePlugin } from '@/types/node-plugin';

export const apitemplateIoNode: NodePlugin = {
  type: 'apitemplate-io',
  name: 'APITemplate.io',
  description: 'Generate images, PDFs, and videos from templates using APITemplate.io',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/apitemplate-io.png',
  color: '#F59E0B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your APITemplate.io API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      default: 'getAccountInformation',
      options: [
        { label: 'Get Account Info', value: 'getAccountInformation', description: 'Get account information' },
        { label: 'Create Image', value: 'createImage', description: 'Create an image from template' },
        { label: 'Create PDF from HTML', value: 'createPdfFromHtml', description: 'Create PDF from HTML' },
        { label: 'Create PDF from URL', value: 'createPdfFromUrl', description: 'Create PDF from URL' },
        { label: 'Create PDF', value: 'createPdf', description: 'Create PDF from template' },
        { label: 'Delete Object', value: 'deleteObject', description: 'Delete an object' },
        { label: 'List Objects', value: 'listObjects', description: 'List objects' },
        { label: 'Custom API Call', value: 'customApiCall', description: 'Make a custom API call' },
      ],
      description: 'Choose the action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs = [];

    // Add inputs based on selected action
    switch (action) {
      case 'createImage':
      case 'createPdf':
        inputs.push(
          {
            name: 'templateId',
            label: 'Template ID',
            type: 'text',
            required: true,
            description: 'The ID of the template to use',
            placeholder: 'template-id',
          },
          {
            name: 'data',
            label: 'Data',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Data for the template (JSON format)',
            placeholder: '{\n  "title": "Hello World",\n  "subtitle": "Generated with APITemplate.io"\n}',
          }
        );
        break;

      case 'createPdfFromHtml':
        inputs.push(
          {
            name: 'htmlContent',
            label: 'HTML Content',
            type: 'textarea',
            required: true,
            description: 'HTML content for PDF generation',
            placeholder: '<html><body><h1>Hello World</h1></body></html>',
          },
          {
            name: 'data',
            label: 'Data',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Additional data for the PDF (JSON format)',
            placeholder: '{}',
          }
        );
        break;

      case 'createPdfFromUrl':
        inputs.push(
          {
            name: 'url',
            label: 'URL',
            type: 'text',
            required: true,
            description: 'URL to convert to PDF',
            placeholder: 'https://example.com',
          },
          {
            name: 'data',
            label: 'Data',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Additional data for the PDF (JSON format)',
            placeholder: '{}',
          }
        );
        break;

      case 'deleteObject':
        inputs.push({
          name: 'objectId',
          label: 'Object ID',
          type: 'text',
          required: true,
          description: 'ID of the object to delete',
          placeholder: 'object-id',
        });
        break;

      case 'customApiCall':
        inputs.push(
          {
            name: 'customEndpoint',
            label: 'Custom Endpoint',
            type: 'text',
            required: true,
            description: 'Custom API endpoint path (e.g., /v2/templates)',
            placeholder: '/v2/custom-endpoint',
          },
          {
            name: 'customMethod',
            label: 'HTTP Method',
            type: 'select',
            required: false,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
            ],
            default: 'GET',
            description: 'HTTP method for the API call',
          },
          {
            name: 'customBody',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body for the API call',
            placeholder: '{\n  "param1": "value1"\n}',
          }
        );
        break;

      case 'getAccountInformation':
      case 'listObjects':
        // These actions don't need additional inputs
        break;

      default:
        break;
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
      name: 'download_url',
      type: 'string',
      description: 'URL to download the generated file',
    },
    {
      name: 'file_size',
      type: 'number',
      description: 'Size of the generated file in bytes',
    },
    {
      name: 'transaction_ref',
      type: 'string',
      description: 'Transaction reference ID',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Status of the generation process',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    
    const client = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    // Coalesce action to default if missing
    const action = inputs.action || 'getAccountInformation';
    
    // Basic validation for required fields based on action
    if (!inputs.apiKey) {
      throw new Error('API Key is required');
    }
    
    if (action === 'createImage' || action === 'createPdf') {
      if (!inputs.templateId) {
        throw new Error(`Template ID is required for ${action}`);
      }
    }
    
    if (action === 'createPdfFromHtml' && !inputs.htmlContent) {
      throw new Error('HTML content is required for createPdfFromHtml');
    }
    
    if (action === 'createPdfFromUrl' && !inputs.url) {
      throw new Error('URL is required for createPdfFromUrl');
    }
    
    if (action === 'deleteObject' && !inputs.objectId) {
      throw new Error('Object ID is required for deleteObject');
    }
    
    if (action === 'customApiCall' && !inputs.customEndpoint) {
      throw new Error('Custom endpoint is required for custom API call');
    }

    // Prepare data with safe JSON parsing
    let parsedData = {};
    let parsedCustomBody = null;
    
    try {
      if (inputs.data && inputs.data.trim()) {
        parsedData = JSON.parse(inputs.data);
      }
    } catch (error) {
      throw new Error(`Invalid JSON in data field: ${error.message}`);
    }
    
    try {
      if (inputs.customBody && inputs.customBody.trim()) {
        parsedCustomBody = inputs.customBody;
      }
    } catch (error) {
      throw new Error(`Invalid JSON in custom body field: ${error.message}`);
    }

    const { data, error } = await client.functions.invoke('apitemplate-io-proxy', {
      body: {
        ...inputs,
        action,
        data: inputs.data ? JSON.stringify(parsedData) : undefined,
        customBody: parsedCustomBody,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};