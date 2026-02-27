import { NodePlugin } from '@/types/node-plugin';

export const copyAiNode: NodePlugin = {
  type: 'copy-ai',
  name: 'Copy.ai',
  description: 'AI-powered copywriting and workflow automation platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/copy-ai.png',
  color: '#7C3AED',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Copy.ai API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Run Workflow', value: 'runWorkflow' },
        { label: 'Get Workflow Run Status', value: 'getWorkflowRunStatus' },
        { label: 'Get Workflow Run Output', value: 'getWorkflowRunOutput' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'runWorkflow') {
      inputs.push(
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true, description: 'The workflow ID to run' },
        { name: 'startVariables', label: 'Start Variables (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Input variables for the workflow as JSON object' },
        { name: 'metadata', label: 'Metadata (JSON)', type: 'code' as const, language: 'json' as const, required: false, description: 'Optional metadata to attach to the run' },
        { name: 'waitForCompletion', label: 'Wait for Completion', type: 'select' as const, required: false, options: [
          { label: 'No (Return Run ID immediately)', value: 'false' },
          { label: 'Yes (Wait and return output)', value: 'true' },
        ], description: 'Whether to wait for the workflow to complete' },
        { name: 'webhookUrl', label: 'Webhook URL', type: 'text' as const, required: false, description: 'URL to receive webhook on completion' }
      );
    } else if (action === 'getWorkflowRunStatus') {
      inputs.push(
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true, description: 'The workflow ID' },
        { name: 'runId', label: 'Run ID', type: 'text' as const, required: true, description: 'The workflow run ID to check' }
      );
    } else if (action === 'getWorkflowRunOutput') {
      inputs.push(
        { name: 'workflowId', label: 'Workflow ID', type: 'text' as const, required: true, description: 'The workflow ID' },
        { name: 'runId', label: 'Run ID', type: 'text' as const, required: true, description: 'The workflow run ID to get output from' }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data from Copy.ai' },
    { name: 'runId', type: 'string', description: 'Workflow run ID' },
    { name: 'status', type: 'string', description: 'Workflow run status (PENDING, PROCESSING, COMPLETE, FAILED)' },
    { name: 'output', type: 'object', description: 'Workflow output data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('copy-ai-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
