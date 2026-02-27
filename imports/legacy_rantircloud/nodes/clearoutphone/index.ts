import { NodePlugin } from '@/types/node-plugin';

export const clearoutPhoneNode: NodePlugin = {
  type: 'clearoutphone',
  name: 'Clearout Phone',
  description: 'Phone number verification and validation service',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clearoutphone.png',
  color: '#00C853',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Token',
      type: 'text',
      required: true,
      description: 'Your ClearoutPhone API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Find Phone Number Carrier', value: 'findPhoneNumberCarrier' },
        { label: 'Find Phone Number Is Mobile', value: 'findPhoneNumberIsMobile' },
        { label: 'Validate Phone Number', value: 'validatePhoneNumber' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'findPhoneNumberCarrier') {
      inputs.push(
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: true, description: 'Phone number to find carrier for (with or without country code)' },
        { name: 'countryCode', label: 'Country Code', type: 'text' as const, required: false, description: 'ISO 2-letter country code (e.g., US, GB, IN)' }
      );
    } else if (action === 'findPhoneNumberIsMobile') {
      inputs.push(
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: true, description: 'Phone number to check if mobile' },
        { name: 'countryCode', label: 'Country Code', type: 'text' as const, required: false, description: 'ISO 2-letter country code (e.g., US, GB, IN)' }
      );
    } else if (action === 'validatePhoneNumber') {
      inputs.push(
        { name: 'phoneNumber', label: 'Phone Number', type: 'text' as const, required: true, description: 'Phone number to validate' },
        { name: 'countryCode', label: 'Country Code', type: 'text' as const, required: false, description: 'ISO 2-letter country code (e.g., US, GB, IN)' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'isValid', type: 'boolean', description: 'Whether the phone number is valid' },
    { name: 'isMobile', type: 'boolean', description: 'Whether the phone number is mobile' },
    { name: 'carrier', type: 'string', description: 'Carrier name' },
    { name: 'lineType', type: 'string', description: 'Line type (mobile, landline, voip, etc.)' },
    { name: 'status', type: 'string', description: 'Phone validation status' },
    { name: 'message', type: 'string', description: 'Human-readable result message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clearoutphone-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
