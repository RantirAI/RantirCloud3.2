import { NodePlugin } from '@/types/node-plugin';

export const asanaNode: NodePlugin = {
  type: 'asana',
  name: 'Asana',
  description: 'Project management and task tracking for teams',
  category: 'action',
  icon: 'https://cdn.prod.website-files.com/67e18b84fa43974c4775c6ac/67f05c9761cce0dff595c713_677c7f461f055b947750c7c2_672ef7fcc03d722c784042a8_asana.svg',
  color: '#F06A6A',
  inputs: [
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'text',
      required: true,
      isApiKey: true,
      description: 'Your Asana personal access token'
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Task', value: 'create_task' },
        { label: 'Get Task', value: 'get_task' },
        { label: 'Update Task', value: 'update_task' },
        { label: 'Delete Task', value: 'delete_task' },
        { label: 'Create Project', value: 'create_project' },
        { label: 'Get Project', value: 'get_project' },
        { label: 'Get Project Tasks', value: 'get_project_tasks' },
        { label: 'Get Workspaces', value: 'get_workspaces' },
        { label: 'Get Workspace Projects', value: 'get_workspace_projects' },
        { label: 'Get Teams', value: 'get_teams' },
        { label: 'Get Users', value: 'get_users' },
        { label: 'Create Subtask', value: 'create_subtask' },
        { label: 'Add Task Comment', value: 'add_task_comment' },
        { label: 'Custom API Call', value: 'custom_api_call' }
      ],
      description: 'Select the Asana action to perform'
    }
  ],
  getDynamicInputs: (currentInputs) => {
    const action = currentInputs?.action;
    if (!action) return [];

    const dynamicInputs = [];

    switch (action) {
      case 'create_task':
        dynamicInputs.push(
          { name: 'workspace', label: 'Workspace ID', type: 'text', required: true },
          { name: 'project', label: 'Project ID', type: 'text', required: true },
          { name: 'name', label: 'Task Name', type: 'text', required: true },
          { name: 'notes', label: 'Notes/Description', type: 'textarea' },
          { name: 'assignee', label: 'Assignee ID', type: 'text' },
          { name: 'due_on', label: 'Due Date (YYYY-MM-DD)', type: 'text' },
          { name: 'completed', label: 'Completed', type: 'boolean', default: false },
          { name: 'tags', label: 'Tag IDs (comma separated)', type: 'text' }
        );
        break;

      case 'get_task':
      case 'update_task':
      case 'delete_task':
        dynamicInputs.push(
          { name: 'task_gid', label: 'Task ID', type: 'text', required: true }
        );
        if (action === 'update_task') {
          dynamicInputs.push(
            { name: 'name', label: 'Task Name', type: 'text' },
            { name: 'notes', label: 'Notes/Description', type: 'textarea' },
            { name: 'assignee', label: 'Assignee ID', type: 'text' },
            { name: 'due_on', label: 'Due Date (YYYY-MM-DD)', type: 'text' },
            { name: 'completed', label: 'Completed', type: 'boolean' }
          );
        }
        break;

      case 'create_project':
        dynamicInputs.push(
          { name: 'name', label: 'Project Name', type: 'text', required: true },
          { name: 'team', label: 'Team ID', type: 'text', required: true },
          { name: 'notes', label: 'Project Description', type: 'textarea' },
          { name: 'public', label: 'Public Project', type: 'boolean', default: false },
          { name: 'color', label: 'Project Color', type: 'select', options: [
            { label: 'Dark Pink', value: 'dark-pink' },
            { label: 'Dark Green', value: 'dark-green' },
            { label: 'Dark Blue', value: 'dark-blue' },
            { label: 'Dark Red', value: 'dark-red' },
            { label: 'Dark Teal', value: 'dark-teal' },
            { label: 'Dark Brown', value: 'dark-brown' },
            { label: 'Dark Orange', value: 'dark-orange' },
            { label: 'Dark Purple', value: 'dark-purple' }
          ]}
        );
        break;

      case 'get_project':
        dynamicInputs.push(
          { name: 'project_gid', label: 'Project ID', type: 'text', required: true }
        );
        break;

      case 'get_project_tasks':
        dynamicInputs.push(
          { name: 'project_gid', label: 'Project ID', type: 'text', required: true },
          { name: 'completed_since', label: 'Completed Since (ISO 8601)', type: 'text' }
        );
        break;

      case 'get_workspace_projects':
      case 'get_teams':
      case 'get_users':
        dynamicInputs.push(
          { name: 'workspace_gid', label: 'Workspace ID', type: 'text', required: true }
        );
        break;

      case 'create_subtask':
        dynamicInputs.push(
          { name: 'parent_task_gid', label: 'Parent Task ID', type: 'text', required: true },
          { name: 'name', label: 'Subtask Name', type: 'text', required: true },
          { name: 'notes', label: 'Notes/Description', type: 'textarea' },
          { name: 'assignee', label: 'Assignee ID', type: 'text' },
          { name: 'due_on', label: 'Due Date (YYYY-MM-DD)', type: 'text' }
        );
        break;

      case 'add_task_comment':
        dynamicInputs.push(
          { name: 'task_gid', label: 'Task ID', type: 'text', required: true },
          { name: 'text', label: 'Comment Text', type: 'textarea', required: true }
        );
        break;

      case 'custom_api_call':
        dynamicInputs.push(
          { name: 'endpoint', label: 'API Endpoint', type: 'text', required: true, description: 'Relative path (e.g., /tasks, /projects)' },
          { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' }
          ]},
          { name: 'body', label: 'Request Body (JSON)', type: 'code', language: 'json', description: 'Request body for POST/PUT requests' },
          { name: 'params', label: 'Query Parameters (JSON)', type: 'code', language: 'json', description: 'Query parameters as JSON object' }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful'
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Asana'
    },
    {
      name: 'gid',
      type: 'string',
      description: 'The global ID of the created/updated item'
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if the operation failed'
    }
  ],
  execute: async (inputs, context) => {
    const { accessToken, action, ...actionInputs } = inputs;

    if (!accessToken) {
      throw new Error('Access Token is required');
    }

    try {
      // Use Supabase proxy function for Asana API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('asana-proxy', {
        body: {
          accessToken,
          action,
          inputs: actionInputs
        }
      });

      if (error) {
        throw new Error(`Asana proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Asana operation failed: ${error.message}`);
    }
  }
};