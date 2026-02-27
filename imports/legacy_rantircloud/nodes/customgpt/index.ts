import { NodePlugin } from '@/types/node-plugin';

export const customgptNode: NodePlugin = {
  type: 'customgpt',
  name: 'CustomGPT',
  description: 'Build and deploy custom AI chatbots trained on your own data',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/customgpt.png',
  color: '#6366F1',
  inputs: [
    { name: 'apiKey', label: 'API Key', type: 'text', required: true, description: 'Your CustomGPT API key', isApiKey: true },
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Create Agent', value: 'createAgent' },
        { label: 'Create Conversation', value: 'createConversation' },
        { label: 'Delete Agent', value: 'deleteAgent' },
        { label: 'Export Conversation', value: 'exportConversation' },
        { label: 'Find Conversation', value: 'findConversation' },
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Update Agent', value: 'updateAgent' },
        { label: 'Update Settings', value: 'updateSettings' },
      ],
    },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'createAgent') {
      inputs.push(
        { name: 'projectName', label: 'Agent Name', type: 'text' as const, required: true },
        { name: 'sitemap', label: 'Sitemap URL', type: 'text' as const, required: false },
      );
    }
    if (['deleteAgent', 'updateAgent', 'updateSettings', 'createConversation', 'findConversation', 'exportConversation', 'sendMessage'].includes(action)) {
      inputs.push({ name: 'projectId', label: 'Agent/Project ID', type: 'text' as const, required: true });
    }
    if (action === 'updateAgent') {
      inputs.push(
        { name: 'projectName', label: 'New Agent Name', type: 'text' as const, required: false },
        { name: 'settings', label: 'Agent Settings (JSON)', type: 'code' as const, language: 'json' as const, required: false },
      );
    }
    if (action === 'updateSettings') {
      inputs.push({ name: 'settings', label: 'Settings (JSON)', type: 'code' as const, language: 'json' as const, required: true });
    }
    if (action === 'sendMessage') {
      inputs.push(
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Leave empty to create new conversation' },
      );
    }
    if (action === 'findConversation') {
      inputs.push({ name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: true });
    }
    if (action === 'exportConversation') {
      inputs.push({ name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: true });
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
    const { data, error } = await supabase.functions.invoke('customgpt-proxy', { body: inputs });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
