import { NodePlugin } from '@/types/node-plugin';

export const browseAiNode: NodePlugin = {
  type: 'browse-ai',
  name: 'Browse AI',
  description: 'Extract data from any website using Browse AI web scraping',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/browse-ai.png',
  color: '#00C853',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Browse AI API key',
      placeholder: 'your-api-key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Get Task Details', value: 'getTaskDetails' },
        { label: 'List Robots', value: 'listRobots' },
        { label: 'Run Robot', value: 'runRobot' },
        { label: 'Create Custom API Call', value: 'createCustomApiCall' },
      ],
      description: 'Action to perform',
      dependsOnApiKey: true,
    },
    {
      name: 'robotId',
      label: 'Robot ID',
      type: 'text',
      required: true,
      description: 'The ID of your Browse AI robot',
      placeholder: 'robot-id',
      dependsOnApiKey: true,
      showWhen: {
        field: 'action',
        values: ['runRobot', 'getTaskDetails']
      }
    },
    {
      name: 'taskId',
      label: 'Task ID',
      type: 'text',
      required: true,
      description: 'Task ID to retrieve details',
      placeholder: 'task-id',
      showWhen: {
        field: 'action',
        values: ['getTaskDetails']
      }
    },
    {
      name: 'inputParameters',
      label: 'Input Parameters',
      type: 'code',
      language: 'json',
      required: false,
      placeholder: '{\n  "url": "https://example.com"\n}',
      description: 'Input parameters for the robot (optional)',
      showWhen: {
        field: 'action',
        values: ['runRobot']
      }
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method for the API call',
      showWhen: {
        field: 'action',
        values: ['createCustomApiCall']
      }
    },
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'text',
      required: true,
      description: 'Browse AI API endpoint (e.g., /v2/robots)',
      placeholder: '/v2/robots',
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
      description: 'Request body for POST/PUT requests (optional)',
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
      description: 'Extracted data or task result',
    },
    {
      name: 'taskId',
      type: 'string',
      description: 'Task ID for tracking',
    },
    {
      name: 'status',
      type: 'string',
      description: 'Task status',
    }
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...otherInputs } = inputs;
    
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('browse-ai-proxy', {
        body: {
          apiKey,
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
      throw new Error(`Browse AI execution failed: ${error.message}`);
    }
  }
};
