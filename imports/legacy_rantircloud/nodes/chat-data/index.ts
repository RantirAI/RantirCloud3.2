import { NodePlugin } from '@/types/node-plugin';

export const chatDataNode: NodePlugin = {
  type: 'chat-data',
  name: 'Chat Data',
  description: 'Chat analytics and data collection platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/chat-data.png',
  color: '#8B5CF6',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Chat Data API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Chatbot', value: 'createChatbot' },
        { label: 'Delete Chatbot', value: 'deleteChatbot' },
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Update Base Prompt', value: 'updateBasePrompt' },
        { label: 'Retrain Chatbot', value: 'retrainChatbot' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createChatbot') {
      inputs.push(
        { name: 'name', label: 'Chatbot Name', type: 'text' as const, required: true },
        { name: 'sourceText', label: 'Source Text', type: 'textarea' as const, required: false, description: 'Text content to train the chatbot' },
        { name: 'model', label: 'Model', type: 'select' as const, required: false, options: [
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ]},
      );
    } else if (action === 'deleteChatbot') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true }
      );
    } else if (action === 'sendMessage') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Optional conversation ID for context' },
      );
    } else if (action === 'updateBasePrompt') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true },
        { name: 'basePrompt', label: 'Base Prompt', type: 'textarea' as const, required: true }
      );
    } else if (action === 'retrainChatbot') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true },
        { name: 'sourceText', label: 'Source Text', type: 'textarea' as const, required: false, description: 'New text content to train on' },
        { name: 'urlsToScrape', label: 'URLs to Scrape', type: 'textarea' as const, required: false, description: 'Comma-separated URLs to scrape for training data' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Chat Data' },
    { name: 'chatbotId', type: 'string', description: 'Created/updated chatbot ID' },
    { name: 'response', type: 'string', description: 'Chatbot response message' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('chat-data-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
