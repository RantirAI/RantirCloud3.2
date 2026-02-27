import { NodePlugin } from '@/types/node-plugin';

export const dashworksNode: NodePlugin = {
  type: 'dashworks',
  name: 'Dashworks',
  description: 'AI knowledge assistant that searches across your connected apps',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/dashworks.png',
  color: '#2563EB',
  inputs: [
    { name: 'apiKey', label: 'API Key', type: 'text', required: true, description: 'Your Dashworks API key', isApiKey: true },
    {
      name: 'action', label: 'Action', type: 'select', required: true,
      options: [
        { label: 'Generate Answer', value: 'generateAnswer' },
      ],
    },
  ],
  getDynamicInputs(currentInputs) {
    const action = currentInputs?.action;
    const inputs: any[] = [];

    if (action === 'generateAnswer') {
      inputs.push(
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true, description: 'The question or message to send' },
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: true, description: 'Bot ID to use for answering (required)' },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Continue an existing conversation' },
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
    const { data, error } = await supabase.functions.invoke('dashworks-proxy', { body: inputs });
    if (error) throw new Error(error.message);
    return { success: data?.success ?? true, data: data?.data, error: data?.error };
  },
};
