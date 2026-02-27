import { NodePlugin } from '@/types/node-plugin';

export const contiguityNode: NodePlugin = {
  type: 'contiguity',
  name: 'Contiguity',
  description: 'SMS, iMessage, and communication platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/contiguity.png',
  color: '#00D4AA',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Contiguity API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Send Text (SMS)', value: 'sendText' },
        { label: 'Send iMessage', value: 'send_iMessage' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'sendText') {
      inputs.push(
        { name: 'to', label: 'To Phone Number', type: 'text' as const, required: true, description: 'Recipient phone number with country code (e.g., +1234567890)' },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true, description: 'SMS message content (max 160 chars per segment)' },
        { name: 'from', label: 'From (Sender ID)', type: 'text' as const, required: false, description: 'Sender ID or phone number' },
        { name: 'mediaUrl', label: 'Media URL', type: 'text' as const, required: false, description: 'URL of media to attach (MMS)' },
        { name: 'callbackUrl', label: 'Callback URL', type: 'text' as const, required: false, description: 'Webhook URL for delivery status' }
      );
    } else if (action === 'send_iMessage') {
      inputs.push(
        { name: 'to', label: 'To (Phone/Email)', type: 'text' as const, required: true, description: 'Recipient phone number or Apple ID email' },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true, description: 'iMessage content' },
        { name: 'from', label: 'From (Phone Number)', type: 'text' as const, required: true, description: 'Sender phone number (required for iMessage)' },
        { name: 'fallback', label: 'SMS Fallback', type: 'select' as const, required: false, options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ], description: 'Fall back to SMS if iMessage fails' },
        { name: 'mediaUrl', label: 'Media URL', type: 'text' as const, required: false, description: 'URL of media to attach' },
        { name: 'callbackUrl', label: 'Callback URL', type: 'text' as const, required: false, description: 'Webhook URL for delivery status' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true, description: 'API endpoint path' },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Contiguity' },
    { name: 'messageId', type: 'string', description: 'Message ID for sent messages' },
    { name: 'status', type: 'string', description: 'Message delivery status' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('contiguity-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
