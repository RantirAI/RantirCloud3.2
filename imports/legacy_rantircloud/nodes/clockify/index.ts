import { NodePlugin } from '@/types/node-plugin';

export const clockifyNode: NodePlugin = {
  type: 'clockify',
  name: 'Clockify',
  description: 'Time tracking and timesheet management',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/clockify.png',
  color: '#03A9F4',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Clockify API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Task', value: 'createTask' },
        { label: 'Create Time Entry', value: 'createTimeEntry' },
        { label: 'Start Timer', value: 'startTimer' },
        { label: 'Stop Timer', value: 'stopTimer' },
        { label: 'Find Task', value: 'findTask' },
        { label: 'Find Time Entry', value: 'findTimeEntry' },
        { label: 'Find Running Timer', value: 'findRunningTimer' },
        { label: 'Custom API Call', value: 'customApiCall' },
      ],
      description: 'The action to perform',
    },
  ],
  getDynamicInputs(currentInputs) {
    const inputs = [];
    const action = currentInputs?.action;

    if (action === 'createTask') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'projectId', label: 'Project ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Task Name', type: 'text' as const, required: true },
        { name: 'assigneeIds', label: 'Assignee IDs (comma-separated)', type: 'text' as const, required: false },
        { name: 'estimate', label: 'Estimate (ISO 8601 duration)', type: 'text' as const, required: false },
        { name: 'billable', label: 'Billable', type: 'boolean' as const, required: false, default: true }
      );
    } else if (action === 'createTimeEntry') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'description', label: 'Description', type: 'text' as const, required: false },
        { name: 'projectId', label: 'Project ID', type: 'text' as const, required: false },
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: false },
        { name: 'tagIds', label: 'Tag IDs (comma-separated)', type: 'text' as const, required: false },
        { name: 'start', label: 'Start Time (ISO 8601)', type: 'text' as const, required: true },
        { name: 'end', label: 'End Time (ISO 8601)', type: 'text' as const, required: true },
        { name: 'billable', label: 'Billable', type: 'boolean' as const, required: false, default: false }
      );
    } else if (action === 'startTimer') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'description', label: 'Description', type: 'text' as const, required: false },
        { name: 'projectId', label: 'Project ID', type: 'text' as const, required: false },
        { name: 'taskId', label: 'Task ID', type: 'text' as const, required: false },
        { name: 'tagIds', label: 'Tag IDs (comma-separated)', type: 'text' as const, required: false },
        { name: 'billable', label: 'Billable', type: 'boolean' as const, required: false, default: false }
      );
    } else if (action === 'stopTimer') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'userId', label: 'User ID (optional, defaults to current user)', type: 'text' as const, required: false }
      );
    } else if (action === 'findTask') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'projectId', label: 'Project ID', type: 'text' as const, required: true },
        { name: 'name', label: 'Task Name (search)', type: 'text' as const, required: false }
      );
    } else if (action === 'findTimeEntry') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'userId', label: 'User ID (optional, defaults to current user)', type: 'text' as const, required: false },
        { name: 'start', label: 'Start Date (ISO 8601)', type: 'text' as const, required: false },
        { name: 'end', label: 'End Date (ISO 8601)', type: 'text' as const, required: false },
        { name: 'projectId', label: 'Project ID (filter)', type: 'text' as const, required: false },
        { name: 'pageSize', label: 'Page Size', type: 'number' as const, required: false, default: 50 }
      );
    } else if (action === 'findRunningTimer') {
      inputs.push(
        { name: 'workspaceId', label: 'Workspace ID', type: 'text' as const, required: true },
        { name: 'userId', label: 'User ID (optional, defaults to current user)', type: 'text' as const, required: false }
      );
    } else if (action === 'customApiCall') {
      inputs.push(
        { name: 'endpoint', label: 'API Endpoint', type: 'text' as const, required: true, description: 'Relative endpoint path' },
        { name: 'method', label: 'HTTP Method', type: 'select' as const, required: true, default: 'GET', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
        ]},
        { name: 'body', label: 'Request Body (JSON)', type: 'code' as const, language: 'json' as const, required: false }
      );
    }

    return inputs;
  },
  outputs: [
    { name: 'success', type: 'boolean', description: 'Whether the operation was successful' },
    { name: 'data', type: 'object', description: 'Response data' },
    { name: 'error', type: 'string', description: 'Error message if operation failed' },
  ],
  async execute(inputs, context) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      'https://appdmmjexevclmpyvtss.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGRtbWpleGV2Y2xtcHl2dHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTg3NDMsImV4cCI6MjA2MDkzNDc0M30.M-2h3XECul-dfNAqz73nXTzWqJgCjAC9tNmv0LRnIjQ'
    );

    const { data, error } = await supabase.functions.invoke('clockify-proxy', {
      body: inputs,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
