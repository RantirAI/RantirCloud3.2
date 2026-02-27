import { NodePlugin } from '@/types/node-plugin';

export const autocallsNode: NodePlugin = {
  type: 'autocalls',
  name: 'Autocalls',
  description: 'Make automated calls with Autocalls',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/autocalls.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Autocalls API key',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Add Lead', value: 'addLead' },
        { label: 'Send SMS', value: 'sendSms' },
        { label: 'Campaign Control', value: 'campaignControl' },
        { label: 'Make Phone Call', value: 'makePhoneCall' },
        { label: 'Delete Lead', value: 'deleteLead' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs: any[] = [];

    if (action === 'addLead') {
      inputs.push({
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        description: 'Lead phone number',
      });
      inputs.push({
        name: 'name',
        label: 'Name',
        type: 'text',
        required: false,
        description: 'Lead name',
      });
      inputs.push({
        name: 'campaignId',
        label: 'Campaign ID',
        type: 'text',
        required: false,
        description: 'Campaign ID to add lead to',
      });
    }

    if (action === 'sendSms') {
      inputs.push({
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        description: 'Phone number to send SMS to',
      });
      inputs.push({
        name: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        description: 'SMS message content',
      });
    }

    if (action === 'campaignControl') {
      inputs.push({
        name: 'campaignId',
        label: 'Campaign ID',
        type: 'text',
        required: true,
        description: 'Campaign ID',
      });
      inputs.push({
        name: 'controlAction',
        label: 'Control Action',
        type: 'select',
        required: true,
        options: [
          { label: 'Start', value: 'start' },
          { label: 'Pause', value: 'pause' },
          { label: 'Stop', value: 'stop' },
        ],
      });
    }

    if (action === 'makePhoneCall') {
      inputs.push({
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        description: 'Phone number to call',
      });
      inputs.push({
        name: 'message',
        label: 'Message',
        type: 'textarea',
        required: true,
        description: 'Message to deliver during the call',
      });
    }

    if (action === 'deleteLead') {
      inputs.push({
        name: 'leadId',
        label: 'Lead ID',
        type: 'text',
        required: true,
        description: 'Lead ID to delete',
      });
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
      name: 'data',
      type: 'object',
      description: 'Response data from Autocalls',
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

    const { data, error } = await supabase.functions.invoke('autocalls-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
