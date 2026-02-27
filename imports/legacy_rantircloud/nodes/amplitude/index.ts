import { NodePlugin } from '@/types/node-plugin';
import { supabase } from '@/integrations/supabase/client';

export const amplitudeNode: NodePlugin = {
  type: 'amplitude',
  name: 'Amplitude',
  description: 'Track product analytics and user behavior',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/64da81538e9bdebe7ae2fa11/64ee6c441b07b9e11db3dc92_A%20mark%20circle.svg',
  color: '#0077FF',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Amplitude API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Track Event', value: 'track_event' },
        { label: 'Identify User', value: 'identify_user' },
      ],
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs = [];
    
    if (currentInputs.action === 'track_event') {
      inputs.push(
        {
          name: 'userId',
          label: 'User ID',
          type: 'text',
          required: true,
          description: 'Unique identifier for the user',
        },
        {
          name: 'eventType',
          label: 'Event Type',
          type: 'text',
          required: true,
          description: 'Name of the event',
        },
        {
          name: 'eventProperties',
          label: 'Event Properties',
          type: 'code',
          language: 'json',
          required: false,
          description: 'JSON object with event properties',
        }
      );
    } else if (currentInputs.action === 'identify_user') {
      inputs.push(
        {
          name: 'userId',
          label: 'User ID',
          type: 'text',
          required: true,
        },
        {
          name: 'userProperties',
          label: 'User Properties',
          type: 'code',
          language: 'json',
          required: true,
          description: 'JSON object with user properties',
        }
      );
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
      description: 'Response data from Amplitude',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs) {
    const { data, error } = await supabase.functions.invoke('amplitude-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
