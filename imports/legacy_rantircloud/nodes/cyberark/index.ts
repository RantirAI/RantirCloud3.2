import { NodePlugin } from '@/types/node-plugin';

export const cyberarkNode: NodePlugin = {
  type: 'cyberark',
  name: 'CyberArk',
  description: 'Enterprise privileged access management for credentials and secrets',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cyberark.png',
  color: '#00A4EF',
  inputs: [
    { name: 'baseUrl', label: 'CyberArk Base URL', type: 'text', required: true, description: 'e.g. https://your-vault.cyberark.cloud', placeholder: 'https://your-vault.cyberark.cloud' },
    { name: 'apiToken', label: 'API Token', type: 'text', required: false, description: 'Bearer token (or use username/password)', isApiKey: true },
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Create User', value: 'createUser' },
        { label: 'Update User', value: 'updateUser' },
        { label: 'Delete User', value: 'deleteUser' },
        { label: 'Activate User', value: 'activateUser' },
        { label: 'Enable User', value: 'enableUser' },
        { label: 'Disable User', value: 'disableUser' },
        { label: 'Find User', value: 'findUser' },
        { label: 'Add Member to Group', value: 'addMemberToGroup' },
        { label: 'Remove Member from Group', value: 'removeMemberFromGroup' },
      ],
    },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'createUser') {
      inputs.push(
        { name: 'username', label: 'Username', type: 'text' as const, required: true },
        { name: 'password', label: 'Initial Password', type: 'text' as const, required: true, isApiKey: true },
        { name: 'email', label: 'Email', type: 'text' as const, required: false },
        { name: 'firstName', label: 'First Name', type: 'text' as const, required: false },
        { name: 'lastName', label: 'Last Name', type: 'text' as const, required: false },
      );
    }
    if (action === 'updateUser') {
      inputs.push(
        { name: 'userId', label: 'User ID', type: 'text' as const, required: true },
        { name: 'updateData', label: 'Update Data (JSON)', type: 'code' as const, language: 'json' as const, required: true, placeholder: '{"email": "new@example.com"}' },
      );
    }
    if (['deleteUser', 'activateUser', 'enableUser', 'disableUser'].includes(action)) {
      inputs.push({ name: 'userId', label: 'User ID', type: 'text' as const, required: true });
    }
    if (action === 'findUser') {
      inputs.push(
        { name: 'query', label: 'Search Query', type: 'text' as const, required: false, description: 'Search by username, email, etc.' },
        { name: 'filter', label: 'Filter', type: 'text' as const, required: false, description: 'Filter expression' },
      );
    }
    if (action === 'addMemberToGroup' || action === 'removeMemberFromGroup') {
      inputs.push(
        { name: 'groupId', label: 'Group ID', type: 'text' as const, required: true },
        { name: 'memberId', label: 'Member ID', type: 'text' as const, required: true },
      );
    }
    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if failed' },
  ],
  async execute(inputs) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );
    const { data, error } = await supabase.functions.invoke('cyberark-proxy', { body: inputs });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
