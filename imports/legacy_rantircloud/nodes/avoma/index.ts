import { NodePlugin } from '@/types/node-plugin';

export const avomaNode: NodePlugin = {
  type: 'avoma',
  name: 'Avoma',
  description: 'Manage meeting recordings and transcriptions with Avoma',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/avoma.png',
  color: '#F59E0B',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Avoma API key',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Call', value: 'createCall' },
        { label: 'Get Meeting Recording', value: 'getMeetingRecording' },
        { label: 'Get Meeting Transcription', value: 'getMeetingTranscription' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs: any[] = [];

    if (action === 'createCall') {
      inputs.push({
        name: 'externalId',
        label: 'External ID',
        type: 'text',
        required: true,
        description: 'External ID from dialer system (e.g., HubSpot)',
      });
      inputs.push({
        name: 'userEmail',
        label: 'User Email',
        type: 'text',
        required: true,
        description: 'Email of the user making the call',
      });
      inputs.push({
        name: 'source',
        label: 'Call Source',
        type: 'text',
        required: true,
        description: 'Source of the call (e.g., HubSpot, Salesforce)',
      });
      inputs.push({
        name: 'startTime',
        label: 'Start Time',
        type: 'text',
        required: true,
        description: 'Call start time (ISO format)',
      });
      inputs.push({
        name: 'fromPhone',
        label: 'From Phone Number',
        type: 'text',
        required: true,
        description: 'Phone number the call is from',
      });
      inputs.push({
        name: 'toPhone',
        label: 'To Phone Number',
        type: 'text',
        required: true,
        description: 'Phone number the call is to',
      });
      inputs.push({
        name: 'direction',
        label: 'Call Direction',
        type: 'select',
        required: true,
        options: [
          { label: 'Inbound', value: 'inbound' },
          { label: 'Outbound', value: 'outbound' },
        ],
        description: 'Direction of the call',
      });
      inputs.push({
        name: 'recordingUrl',
        label: 'Recording URL',
        type: 'text',
        required: false,
        description: 'URL to the call recording',
      });
      inputs.push({
        name: 'participants',
        label: 'Participants',
        type: 'code',
        language: 'json',
        required: false,
        description: 'JSON array of participants',
      });
    }

    if (action === 'getMeetingRecording' || action === 'getMeetingTranscription') {
      inputs.push({
        name: 'meetingId',
        label: 'Meeting ID',
        type: 'text',
        required: true,
        description: 'Meeting ID',
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
      description: 'Response data from Avoma',
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

    const { data, error } = await supabase.functions.invoke('avoma-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
