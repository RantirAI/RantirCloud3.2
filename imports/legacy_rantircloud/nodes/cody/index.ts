import { NodePlugin } from '@/types/node-plugin';

export const codyNode: NodePlugin = {
  type: 'cody',
  name: 'Cody',
  description: 'AI-powered business assistant and knowledge base',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/cody.png',
  color: '#7C3AED',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Cody API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Document From Text', value: 'createDocumentFromText' },
        { label: 'Upload File', value: 'uploadFile' },
        { label: 'Send Message', value: 'sendMessage' },
        { label: 'Create Conversation', value: 'createConversation' },
        { label: 'Find Bot', value: 'findBot' },
        { label: 'Find Conversation', value: 'findConversation' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createDocumentFromText') {
      inputs.push(
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: true, description: 'ID of the bot to add document to' },
        { name: 'name', label: 'Document Name', type: 'text' as const, required: true, description: 'Name of the document' },
        { name: 'content', label: 'Content', type: 'textarea' as const, required: true, description: 'Document content (text)' },
        { name: 'folderId', label: 'Folder ID', type: 'text' as const, required: false, description: 'ID of folder to place document in' }
      );
    } else if (action === 'uploadFile') {
      inputs.push(
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: true, description: 'ID of the bot to upload file to' },
        { name: 'fileUrl', label: 'File URL', type: 'text' as const, required: true, description: 'URL of the file to upload' },
        { name: 'fileName', label: 'File Name', type: 'text' as const, required: false, description: 'Name for the uploaded file' },
        { name: 'folderId', label: 'Folder ID', type: 'text' as const, required: false, description: 'ID of folder to place file in' }
      );
    } else if (action === 'sendMessage') {
      inputs.push(
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: true, description: 'ID of the bot to message' },
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true, description: 'Message to send to the bot' },
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'Leave empty to auto-create a new conversation (requires Bot ID)' }
      );
    } else if (action === 'createConversation') {
      inputs.push(
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: true, description: 'ID of the bot' },
        { name: 'name', label: 'Conversation Name', type: 'text' as const, required: false, description: 'Name for the conversation' }
      );
    } else if (action === 'findBot') {
      inputs.push(
        { name: 'botName', label: 'Bot Name', type: 'text' as const, required: false, description: 'Name of the bot to find (partial match)' },
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: false, description: 'ID of the bot to find' }
      );
    } else if (action === 'findConversation') {
      inputs.push(
        { name: 'conversationId', label: 'Conversation ID', type: 'text' as const, required: false, description: 'ID of the conversation to find' },
        { name: 'botId', label: 'Bot ID', type: 'text' as const, required: false, description: 'Filter by bot ID' }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'API endpoint path' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'response', type: 'string', description: 'Bot response message' },
    { name: 'conversationId', type: 'string', description: 'Conversation ID' },
    { name: 'messageId', type: 'string', description: 'Message ID' },
    { name: 'documentId', type: 'string', description: 'Document ID' },
    { name: 'botId', type: 'string', description: 'Bot ID' },
    { name: 'bot', type: 'object', description: 'Bot information' },
    { name: 'conversation', type: 'object', description: 'Conversation information' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('cody-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
