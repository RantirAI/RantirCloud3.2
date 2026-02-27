import { NodePlugin } from '@/types/node-plugin';

export const claudeNode: NodePlugin = {
  type: 'claude',
  name: 'Claude',
  description: 'Anthropic Claude AI assistant for text generation and analysis',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/claude.png',
  color: '#CC785C',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Anthropic API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask Claude', value: 'askClaude' },
        { label: 'Extract Structured Data', value: 'extractStructuredData' },
        { label: 'Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'askClaude') {
      inputs.push(
        { name: 'model', label: 'Model', type: 'select' as const, required: true, default: 'claude-sonnet-4-6', options: [
          { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
          { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
          { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5' },
        ]},
        { name: 'message', label: 'Message', type: 'textarea' as const, required: true, description: 'The message to send to Claude' },
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea' as const, required: false, description: 'Optional system instructions' },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number' as const, required: false, default: 1024 },
        { name: 'temperature', label: 'Temperature', type: 'number' as const, required: false, default: 1 }
      );
    } else if (action === 'extractStructuredData') {
      inputs.push(
        { name: 'model', label: 'Model', type: 'select' as const, required: true, default: 'claude-sonnet-4-6', options: [
          { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
          { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
        ]},
        { name: 'text', label: 'Text to Parse', type: 'textarea' as const, required: true, description: 'The text to extract data from' },
        { name: 'schema', label: 'Output Schema (JSON)', type: 'code' as const, language: 'json' as const, required: true, description: 'JSON schema defining the structure to extract' },
        { name: 'instructions', label: 'Additional Instructions', type: 'textarea' as const, required: false, description: 'Extra instructions for extraction' },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number' as const, required: false, default: 2048 }
      );
    } else if (action === 'createCustomApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, default: '/v1/messages' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'POST', options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'response', type: 'string', description: 'Claude response text' },
    { name: 'data', type: 'object', description: 'Full response data' },
    { name: 'usage', type: 'object', description: 'Token usage information' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('claude-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
