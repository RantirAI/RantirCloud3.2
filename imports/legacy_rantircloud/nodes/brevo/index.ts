import { NodePlugin } from '@/types/node-plugin';

export const brevoNode: NodePlugin = {
  type: 'brevo',
  name: 'Brevo',
  description: 'Send emails and manage contacts using Brevo (formerly Sendinblue)',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/brevo.png',
  color: '#0B996E',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Brevo API key',
      placeholder: 'xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create or Update Contact', value: 'create_or_update_contact', description: 'Create or update a contact' },
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call to Brevo' },
      ],
      description: 'Choose the Brevo operation to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    // Contact fields for create_or_update_contact
    if (action === 'create_or_update_contact') {
      dynamicInputs.push({
        name: 'email',
        label: 'Contact Email',
        type: 'text',
        required: true,
        description: 'Contact email address',
        placeholder: 'contact@example.com',
      },
      {
        name: 'attributes',
        label: 'Contact Attributes',
        type: 'code',
        language: 'json',
        required: false,
        description: 'JSON object with contact attributes',
        placeholder: '{\n  "FIRSTNAME": "John",\n  "LASTNAME": "Doe",\n  "SMS": "+1234567890"\n}',
      },
      {
        name: 'listIds',
        label: 'List IDs',
        type: 'text',
        required: false,
        description: 'Comma-separated list of list IDs to add contact to',
        placeholder: '1,2,3',
      });
    }

    // Custom API call fields
    if (action === 'custom_api_call') {
      dynamicInputs.push({
        name: 'endpoint',
        label: 'API Endpoint',
        type: 'text',
        required: true,
        description: 'Brevo API endpoint (e.g., /v3/smtp/email)',
        placeholder: '/v3/smtp/email',
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
      });
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
      name: 'messageId',
      type: 'string',
      description: 'Message ID for sent email',
    },
    {
      name: 'contact',
      type: 'object',
      description: 'Contact information',
    },
    {
      name: 'lists',
      type: 'array',
      description: 'Array of contact lists',
    },
    {
      name: 'data',
      type: 'object',
      description: 'Raw response data from Brevo',
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
      fromEmail,
      fromName,
      toEmail,
      toName,
      subject,
      htmlContent,
      textContent,
      templateId,
      templateParams,
      email,
      attributes,
      listIds
    } = inputs;

    if (!apiKey) {
      throw new Error('Brevo API key is required');
    }

    try {
      let parsedTemplateParams = null;
      if (templateParams) {
        try {
          parsedTemplateParams = JSON.parse(templateParams);
        } catch (e) {
          throw new Error('Template parameters must be valid JSON');
        }
      }

      let parsedAttributes = null;
      if (attributes) {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (e) {
          throw new Error('Attributes must be valid JSON');
        }
      }

      let parsedListIds = null;
      if (listIds) {
        parsedListIds = listIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }

      const requestData = {
        action,
        apiKey,
        fromEmail,
        fromName,
        toEmail,
        toName,
        subject,
        htmlContent,
        textContent,
        templateId,
        templateParams: parsedTemplateParams,
        email,
        attributes: parsedAttributes,
        listIds: parsedListIds,
      };

      // Get Supabase client for authentication
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in to use Brevo integration.');
      }

      const response = await fetch(`https://appdmmjexevclmpyvtss.supabase.co/functions/v1/brevo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.messageId,
        contact: result.contact,
        lists: result.lists,
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        messageId: null,
        contact: null,
        lists: null,
        data: null,
        error: error.message,
      };
    }
  },
};