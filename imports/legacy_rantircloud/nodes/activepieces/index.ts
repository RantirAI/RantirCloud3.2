import { NodePlugin } from '@/types/node-plugin';
import { Workflow } from 'lucide-react';

// Helper function to resolve variables
const resolveVariable = (variableBinding: string): string => {
  if (typeof variableBinding !== 'string') {
    return variableBinding;
  }

  // Handle environment variables
  if (variableBinding.startsWith('env.')) {
    const envKey = variableBinding.replace('env.', '');
    const envVars = JSON.parse(localStorage.getItem('flow-env-vars') || '{}');
    return envVars[envKey] || '';
  }

  // Handle flow variables
  const flowId = window.location.pathname.split('/').pop();
  if (flowId) {
    const flowVariables = JSON.parse(localStorage.getItem(`flow-variables-${flowId}`) || '{}');
    return flowVariables[variableBinding] || variableBinding;
  }

  return variableBinding;
};

export const activepiecesNode: NodePlugin = {
  type: 'activepieces',
  name: 'Activepieces',
  description: 'Connect to Activepieces automation platform to trigger flows and manage workflow executions',
  category: 'action',
  icon: Workflow,
  color: '#6C5CE7',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Activepieces API key',
      isApiKey: true,
    },
    {
      name: 'instanceUrl',
      label: 'Instance URL',
      type: 'text',
      required: true,
      description: 'Your Activepieces instance URL (e.g., https://cloud.activepieces.com)',
      placeholder: 'https://cloud.activepieces.com',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create Project', value: 'create_project', description: 'Create a new project' },
        { label: 'Update Project', value: 'update_project', description: 'Update an existing project' },
        { label: 'List Projects', value: 'list_projects', description: 'List all projects' },
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call' },
      ],
      description: 'Choose the Activepieces action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'create_project':
        dynamicInputs.push(
          {
            name: 'displayName',
            label: 'Project Name',
            type: 'text',
            required: true,
            description: 'Name of the project to create',
          },
          {
            name: 'type',
            label: 'Project Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Standalone', value: 'STANDALONE' },
              { label: 'Platform Managed', value: 'PLATFORM_MANAGED' },
            ],
            description: 'Type of project to create',
          }
        );
        break;

      case 'update_project':
        dynamicInputs.push(
          {
            name: 'projectId',
            label: 'Project ID',
            type: 'text',
            required: true,
            description: 'ID of the project to update',
          },
          {
            name: 'displayName',
            label: 'Project Name',
            type: 'text',
            required: false,
            description: 'Updated name of the project',
          }
        );
        break;

      case 'list_projects':
        dynamicInputs.push(
          {
            name: 'limit',
            label: 'Limit',
            type: 'number',
            required: false,
            description: 'Maximum number of projects to return',
            default: 20,
          },
          {
            name: 'cursor',
            label: 'Cursor',
            type: 'text',
            required: false,
            description: 'Pagination cursor',
          }
        );
        break;

      case 'custom_api_call':
        dynamicInputs.push(
          {
            name: 'endpoint',
            label: 'API Endpoint',
            type: 'text',
            required: true,
            description: 'API endpoint to call (e.g., /api/v1/flows)',
            placeholder: '/api/v1/flows',
          },
          {
            name: 'method',
            label: 'HTTP Method',
            type: 'select',
            required: true,
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'DELETE', value: 'DELETE' },
              { label: 'PATCH', value: 'PATCH' },
            ],
            description: 'HTTP method to use',
            default: 'GET',
          },
          {
            name: 'requestBody',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body (for POST, PUT, PATCH)',
            placeholder: '{\n  "key": "value"\n}',
          },
          {
            name: 'queryParams',
            label: 'Query Parameters',
            type: 'code',
            language: 'json',
            required: false,
            description: 'Query parameters as JSON object',
            placeholder: '{\n  "limit": 20,\n  "page": 1\n}',
          }
        );
        break;
    }

    return dynamicInputs;
  },
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    {
      name: 'data',
      type: 'object',
      description: 'The response data from Activepieces',
    },
    {
      name: 'projectId',
      type: 'string',
      description: 'ID of the project (for project operations)',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { apiKey, instanceUrl, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedApiKey = resolveVariable(apiKey);
    const resolvedInstanceUrl = resolveVariable(instanceUrl);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedApiKey) {
      throw new Error('Activepieces API key is required');
    }

    if (!resolvedInstanceUrl) {
      throw new Error('Activepieces instance URL is required');
    }

    try {
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;
      let queryParams = '';

      switch (action) {
        case 'create_project':
          endpoint = '/api/v1/projects';
          method = 'POST';
          requestBody = {
            displayName: resolvedInputs.displayName,
            type: resolvedInputs.type,
          };
          break;

        case 'update_project':
          endpoint = `/api/v1/projects/${resolvedInputs.projectId}`;
          method = 'POST';
          requestBody = {
            displayName: resolvedInputs.displayName,
          };
          break;

        case 'list_projects':
          endpoint = '/api/v1/projects';
          const projectParams = new URLSearchParams();
          if (resolvedInputs.limit) projectParams.append('limit', resolvedInputs.limit.toString());
          if (resolvedInputs.cursor) projectParams.append('cursor', resolvedInputs.cursor);
          queryParams = projectParams.toString();
          break;

        case 'custom_api_call':
          endpoint = resolvedInputs.endpoint;
          method = resolvedInputs.method || 'GET';
          
          if (resolvedInputs.requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
            try {
              requestBody = JSON.parse(resolvedInputs.requestBody);
            } catch (e) {
              throw new Error('Invalid JSON in request body');
            }
          }
          
          if (resolvedInputs.queryParams) {
            try {
              const params = JSON.parse(resolvedInputs.queryParams);
              const urlParams = new URLSearchParams();
              Object.entries(params).forEach(([key, value]) => {
                urlParams.append(key, String(value));
              });
              queryParams = urlParams.toString();
            } catch (e) {
              throw new Error('Invalid JSON in query parameters');
            }
          }
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for Activepieces API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('activepieces-proxy', {
        body: {
          apiKey: resolvedApiKey,
          instanceUrl: resolvedInstanceUrl,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`Activepieces proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        projectId: null,
        error: error.message,
      };
    }
  },
};