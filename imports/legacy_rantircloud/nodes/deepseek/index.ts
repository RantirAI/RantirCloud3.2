import { NodePlugin } from '@/types/node-plugin';

export const deepseekNode: NodePlugin = {
  type: 'deepseek',
  name: 'DeepSeek',
  description: 'DeepSeek AI - powerful LLM for chat completions and code generation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/deepseek.png',
  color: '#4D6BFE',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      placeholder: 'Enter your DeepSeek API key',
      description: 'Your DeepSeek API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask DeepSeek', value: 'askDeepseek', description: 'Send a prompt to DeepSeek and get a response' },
      ],
      description: 'Select the DeepSeek action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const { action } = currentInputs;
    const inputs: any[] = [];

    if (action === 'askDeepseek') {
      inputs.push(
        { name: 'model', label: 'Model', type: 'select', required: true, default: 'deepseek-chat', options: [
          { label: 'DeepSeek Chat (V3)', value: 'deepseek-chat' },
          { label: 'DeepSeek Reasoner (R1)', value: 'deepseek-reasoner' },
        ]},
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea', required: false, placeholder: 'You are a helpful assistant.' },
        { name: 'prompt', label: 'User Message', type: 'textarea', required: true, placeholder: 'Hello, can you help me?' },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number', required: false, default: 1024, description: 'Maximum number of tokens to generate' },
        { name: 'temperature', label: 'Temperature', type: 'number', required: false, default: 0.7, description: 'Sampling temperature (0-2)' },
        { name: 'topP', label: 'Top P', type: 'number', required: false, default: 1, description: 'Nucleus sampling parameter' },
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'result', type: 'object', description: 'Full response from DeepSeek API' },
    { name: 'response', type: 'string', description: 'Generated text response' },
    { name: 'usage', type: 'object', description: 'Token usage statistics' },
    { name: 'status', type: 'string', description: 'Operation status' },
  ],
  async execute(inputs, context) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://appdmmjexevclmpyvtss.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
      );

      const { data, error } = await supabase.functions.invoke('deepseek-proxy', {
        body: inputs,
      });

      if (error) throw error;

      return {
        result: data,
        response: data?.response || data?.choices?.[0]?.message?.content || '',
        usage: data?.usage || {},
        status: data?.status || 'ok',
      };
    } catch (error: any) {
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  },
};
