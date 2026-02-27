import { NodePlugin } from '@/types/node-plugin';

export const chatbaseNode: NodePlugin = {
  type: 'chatbase',
  name: 'Chatbase',
  description: 'Build and deploy AI chatbots trained on your data',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05caa8335f0a886beeef1_677c7f38ca4bf313ae559054_672ef80cc234a64d783dd98c_chatbase_08d0146f11.jpeg',
  color: '#000000',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Chatbase API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Chatbot', value: 'createChatbot' },
        { label: 'Send Prompt to Chatbot', value: 'sendPromptToChatbot' },
        { label: 'Search Conversations', value: 'searchConversations' },
        { label: 'List Chatbots', value: 'listChatbots' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
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
        { name: 'urlsToScrape', label: 'URLs to Scrape', type: 'textarea' as const, required: false, description: 'Comma-separated URLs to scrape for training data' },
      );
    } else if (action === 'sendPromptToChatbot') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Optional conversation ID for context' },
      );
    } else if (action === 'searchConversations') {
      inputs.push(
        { name: 'chatbotId', label: 'Chatbot ID', type: 'text' as const, required: true },
        { name: 'query', label: 'Search Query', type: 'text' as const, required: false },
        { name: 'startDate', label: 'Start Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
        { name: 'endDate', label: 'End Date', type: 'text' as const, required: false, placeholder: 'YYYY-MM-DD' },
      );
    } else if (action === 'listChatbots') {
      // No additional inputs needed
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'endpoint', label: 'Endpoint', type: 'text' as const, required: true },
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Chatbase' },
    { name: 'response', type: 'string', description: 'Chatbot response message' },
    { name: 'chatbotId', type: 'string', description: 'Created/updated chatbot ID' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('chatbase-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
