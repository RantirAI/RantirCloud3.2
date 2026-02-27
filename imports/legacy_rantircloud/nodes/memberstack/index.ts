import { NodePlugin } from '@/types/node-plugin';

export const memberstackNode: NodePlugin = {
  type: 'memberstack',
  name: 'Memberstack',
  description: 'Manage members and authentication with Memberstack',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/5be2fa35a6796462795d8502/5c7474e89b5a57b01bc6b3be_Logo%40250.png',
  color: '#6366F1',
  inputs: [
    {
      name: 'secretKey',
      label: 'Secret Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Memberstack Secret Key',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Member', value: 'get_member' },
        { label: 'List Members', value: 'list_members' },
        { label: 'Create Member', value: 'create_member' },
        { label: 'Update Member', value: 'update_member' },
        { label: 'Delete Member', value: 'delete_member' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs.action;
    const inputs: any[] = [];

    if (action === 'get_member' || action === 'update_member' || action === 'delete_member') {
      inputs.push({
        name: 'memberId',
        label: 'Member ID',
        type: 'text',
        required: true,
        description: 'Member ID',
      });
    }

    if (action === 'create_member' || action === 'update_member') {
      inputs.push({
        name: 'email',
        label: 'Email',
        type: 'text',
        required: action === 'create_member',
        description: 'Member email address',
      });
      inputs.push({
        name: 'password',
        label: 'Password',
        type: 'text',
        required: action === 'create_member',
        description: 'Member password',
      });
      inputs.push({
        name: 'metadata',
        label: 'Metadata',
        type: 'code',
        language: 'json',
        required: false,
        description: 'Additional member metadata (JSON)',
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
      description: 'Response data from Memberstack',
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

    const { data, error } = await supabase.functions.invoke('memberstack-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
