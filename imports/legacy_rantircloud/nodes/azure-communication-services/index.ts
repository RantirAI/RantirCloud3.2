import { NodePlugin } from '@/types/node-plugin';

export const azureCommunicationServicesNode: NodePlugin = {
  type: 'azure-communication-services',
  name: 'Azure Communication Services',
  description: 'Send emails using Azure Communication Services',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/azure-communication-services.png',
  color: '#0078D4',
  inputs: [
    {
      name: 'connectionString',
      label: 'Connection String',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Azure Communication Services connection string',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Email', value: 'sendEmail' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs: any[] = [];

    inputs.push({
      name: 'to',
      label: 'To',
      type: 'text',
      required: true,
      description: 'Recipient email address',
    });
    inputs.push({
      name: 'from',
      label: 'From',
      type: 'text',
      required: true,
      description: 'Sender email address',
    });
    inputs.push({
      name: 'subject',
      label: 'Subject',
      type: 'text',
      required: true,
      description: 'Email subject',
    });
    inputs.push({
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      description: 'Email message content',
    });

    return inputs;
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
      description: 'Response data from Azure',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      context.envVars?.SUPABASE_URL || '',
      context.envVars?.SUPABASE_ANON_KEY || ''
    );

    const { data, error } = await supabase.functions.invoke('azure-communication-services-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
