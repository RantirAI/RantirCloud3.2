import { NodePlugin } from '@/types/node-plugin';

export const comfyicuNode: NodePlugin = {
  type: 'comfyicu',
  name: 'Comfy ICU',
  description: 'Run ComfyUI workflows in the cloud for AI image and video generation',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/comfyicu.png',
  color: '#7C3AED',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Comfy ICU API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Run Output', value: 'getRunOutput' },
        { label: 'Get Run Status', value: 'getRunStatus' },
        { label: 'List Workflows', value: 'listWorkflows' },
        { label: 'Submit Workflow Run', value: 'submitWorkflowRun' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'submitWorkflowRun') {
      inputs.push(
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true, description: 'The ID of the workflow to run' },
        { name: 'prompt', label: 'Prompt / Input Parameters (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'JSON object with workflow input parameters' },
        { name: 'webhook', label: 'Webhook URL', type: 'text' as const, required: false, description: 'URL to receive completion notification' }
      );
    } else if (action === 'getRunStatus' || action === 'getRunOutput') {
      inputs.push(
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true, description: 'The ID of the workflow' },
        { name: 'runId', label: 'Run ID', type: 'text' as const, required: true, description: 'The ID of the workflow run' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Comfy ICU' },
    { name: 'runId', type: 'string', description: 'The ID of the created run' },
    { name: 'status', type: 'string', description: 'Run status (pending, running, completed, failed)' },
    { name: 'outputs', type: 'array', description: 'Generated output files/images' },
    { name: 'workflows', type: 'array', description: 'List of workflows' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.functions.invoke('comfyicu-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
