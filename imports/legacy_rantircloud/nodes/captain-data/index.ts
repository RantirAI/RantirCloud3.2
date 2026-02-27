import { NodePlugin } from '@/types/node-plugin';

export const captainDataNode: NodePlugin = {
  type: 'captain-data',
  name: 'Captain Data',
  description: 'Automate data extraction and enrichment workflows',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/captain-data.png',
  color: '#4F46E5',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your Captain Data API key. Find it in Settings > API.',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'projectId',
      label: 'Project ID',
      type: 'text',
      required: true,
      description: 'Your Captain Data project UID. Find it in Settings > API.',
      placeholder: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Launch Workflow', value: 'launchWorkflow' },
        { label: 'Get Job Results', value: 'getJobResults' },
        { label: 'List Workflows', value: 'listWorkflows' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'workflowId',
      label: 'Workflow ID',
      type: 'text',
      required: false,
      description: 'ID of the workflow',
      placeholder: 'workflow-id',
      showWhen: {
        field: 'action',
        values: ['launchWorkflow']
      }
    },
    {
      name: 'inputData',
      label: 'Input Data',
      type: 'code',
      language: 'json',
      required: false,
      description: 'Input data for the workflow',
      placeholder: '{\n  "data": []\n}',
      showWhen: {
        field: 'action',
        values: ['launchWorkflow']
      }
    },
    {
      name: 'jobId',
      label: 'Job ID',
      type: 'text',
      required: false,
      description: 'ID of the job to get results for',
      placeholder: 'job-id',
      showWhen: {
        field: 'action',
        values: ['getJobResults']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: false,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method for custom API call',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: false,
      description: 'API endpoint path',
      placeholder: '/workflows',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'body',
      label: 'Request Body',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{}',
      description: 'Request body for POST/PUT requests',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
  ],
  outputs: [
    {
      name: 'data',
      type: 'object',
      description: 'Operation result data',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Operation status',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Success indicator',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, projectId, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!projectId) {
      throw new Error('Project ID is required. Find it in your Captain Data project settings.');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('captain-data-proxy', {
        body: {
          apiKey,
          projectId,
          action,
          ...otherInputs
        }
      });

      if (error) {
        throw new Error(`Proxy error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error: any) {
      throw new Error(`Captain Data execution failed: ${error.message}`);
    }
  }
};
