import { NodePlugin } from '@/types/node-plugin';

export const cryptolensNode: NodePlugin = {
  type: 'cryptolens',
  name: 'Cryptolens',
  description: 'Software licensing and key management platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cryptolens.png',
  color: '#1E88E5',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      description: 'Your Cryptolens access token',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Customer', value: 'addCustomer', description: 'Create a new customer' },
        { label: 'Block Key', value: 'blockKey', description: 'Block a license key' },
        { label: 'Create Key', value: 'createKey', description: 'Create a new license key' },
        { label: 'Custom API Call', value: 'createCustomApiCall', description: 'Make a custom API call to Cryptolens' },
      ],
      description: 'Choose the Cryptolens operation',
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    if (action === 'addCustomer') {
      dynamicInputs.push(
        {
          name: 'customerName',
          label: 'Customer Name',
          type: 'text',
          required: true,
          description: 'Name of the customer',
          placeholder: 'John Doe',
        },
        {
          name: 'customerEmail',
          label: 'Customer Email',
          type: 'text',
          required: false,
          description: 'Email address of the customer',
          placeholder: 'john@example.com',
        },
        {
          name: 'companyName',
          label: 'Company Name',
          type: 'text',
          required: false,
          description: 'Company name of the customer',
          placeholder: 'Acme Inc',
        }
      );
    }

    if (action === 'blockKey') {
      dynamicInputs.push(
        {
          name: 'productId',
          label: 'Product ID',
          type: 'text',
          required: true,
          description: 'Your Cryptolens product ID',
          placeholder: '12345',
        },
        {
          name: 'licenseKey',
          label: 'License Key',
          type: 'text',
          required: true,
          description: 'The license key to block',
          placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX',
        }
      );
    }

    if (action === 'createKey') {
      dynamicInputs.push(
        {
          name: 'productId',
          label: 'Product ID',
          type: 'text',
          required: true,
          description: 'Your Cryptolens product ID',
          placeholder: '12345',
        },
        {
          name: 'period',
          label: 'Validity Period (days)',
          type: 'number',
          required: false,
          description: 'Number of days the license is valid',
          default: 365,
        },
        {
          name: 'maxNoOfMachines',
          label: 'Max Machines',
          type: 'number',
          required: false,
          description: 'Maximum number of machines',
          default: 1,
        },
        {
          name: 'f1',
          label: 'Feature 1',
          type: 'checkbox',
          required: false,
          description: 'Enable Feature 1',
        },
        {
          name: 'f2',
          label: 'Feature 2',
          type: 'checkbox',
          required: false,
          description: 'Enable Feature 2',
        },
        {
          name: 'f3',
          label: 'Feature 3',
          type: 'checkbox',
          required: false,
          description: 'Enable Feature 3',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          required: false,
          description: 'Internal notes for this license',
        },
        {
          name: 'customerId',
          label: 'Customer ID',
          type: 'text',
          required: false,
          description: 'Link license to a customer',
        }
      );
    }

    if (action === 'createCustomApiCall') {
      dynamicInputs.push(
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          default: 'POST',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
          ],
          description: 'HTTP method for the API call',
        },
        {
          name: 'endpoint',
          label: 'Endpoint',
          type: 'text',
          required: true,
          description: 'API endpoint path (e.g., /key/Activate)',
          placeholder: '/key/Activate',
        },
        {
          name: 'params',
          label: 'Parameters (JSON)',
          type: 'code',
          language: 'json',
          required: false,
          description: 'Request parameters as JSON',
          placeholder: '{\n  "ProductId": "12345",\n  "Key": "XXXXX-XXXXX-XXXXX-XXXXX"\n}',
        }
      );
    }

    return dynamicInputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'licenseKey', type: 'string', description: 'The license key (for createKey action)' },
    { name: 'customerId', type: 'string', description: 'Customer ID (for addCustomer action)' },
    { name: 'data', type: 'object', description: 'Full response from Cryptolens' },
    { name: 'message', type: 'string', description: 'Status message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        'https://appdmmjexevclmpyvtss.supabase.co/functions/v1/cryptolens-proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(inputs),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        licenseKey: result.licenseKey,
        customerId: result.customerId,
        data: result.data,
        message: result.message,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        licenseKey: null,
        customerId: null,
        data: null,
        message: null,
        error: error.message,
      };
    }
  },
};
