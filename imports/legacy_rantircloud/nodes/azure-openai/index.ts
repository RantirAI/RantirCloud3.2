import { NodePlugin } from '@/types/node-plugin';

export const azureOpenAINode: NodePlugin = {
  type: 'azure-openai',
  name: 'Azure OpenAI',
  description: 'Use Azure OpenAI models for AI completions',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/azure-openai.png',
  color: '#0078D4',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Azure OpenAI API key',
    },
    {
      name: 'endpoint',
      label: 'Endpoint',
      type: 'text',
      required: true,
      description: 'Azure OpenAI endpoint URL',
    },
    {
      name: 'deploymentName',
      label: 'Deployment Name',
      type: 'text',
      required: true,
      description: 'Azure OpenAI deployment name',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Ask GPT', value: 'askGpt' },
      ],
      description: 'Action to perform',
    },
  ],
  getDynamicInputs: (currentInputs) => {
    const inputs: any[] = [];

    inputs.push({
      name: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      required: true,
      description: 'Prompt for the AI model',
    });
    inputs.push({
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      required: false,
      default: 500,
      description: 'Maximum tokens in response',
    });
    inputs.push({
      name: 'temperature',
      label: 'Temperature',
      type: 'number',
      required: false,
      default: 0.7,
      description: 'Sampling temperature (0-1)',
    });

    return inputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'response',
      type: 'string',
      description: 'AI-generated response',
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

    const { data, error } = await supabase.functions.invoke('azure-openai-action', {
      body: inputs,
    });

    if (error) throw error;
    return data;
  },
};
