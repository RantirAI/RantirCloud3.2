import { NodePlugin } from '@/types/node-plugin';

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

export const aianswerNode: NodePlugin = {
  type: 'aianswer',
  name: 'AI Answer',
  description: 'AI-powered phone call management and agent communication platform',
  category: 'action',
  icon: 'https://cdn.activepieces.com/pieces/aianswer.png',
  color: '#10B981',
  inputs: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      required: true,
      description: 'Your AI Answer API key',
      isApiKey: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Gmail get list of Agents', value: 'get_agents_list', description: 'Get list of available agents from Gmail' },
        { label: 'Create Phone Call', value: 'create_phone_call', description: 'Create a new phone call' },
        { label: 'Get Call Details', value: 'get_call_details', description: 'Get details of a specific call' },
        { label: 'Schedule Call Agent', value: 'schedule_call', description: 'Schedule a call with an agent' },
        { label: 'Get Call Transcript', value: 'get_call_transcript', description: 'Get transcript of a call' },
        { label: 'Custom API Call', value: 'custom_api_call', description: 'Make a custom API call' },
      ],
      description: 'Choose the AI Answer action to perform',
      dependsOnApiKey: true,
    },
  ],
  getDynamicInputs: (currentInputs: Record<string, any>) => {
    const action = currentInputs?.action;
    const dynamicInputs = [];

    switch (action) {
      case 'get_agents_list':
        dynamicInputs.push(
          {
            name: 'gmailAccount',
            label: 'Gmail Account',
            type: 'text',
            required: false,
            description: 'Gmail account to search for agents',
            placeholder: 'agents@company.com',
          },
          {
            name: 'limit',
            label: 'Limit',
            type: 'number',
            required: false,
            description: 'Maximum number of agents to return',
            default: 50,
          }
        );
        break;

      case 'create_phone_call':
        dynamicInputs.push(
          {
            name: 'phoneNumber',
            label: 'Phone Number',
            type: 'text',
            required: true,
            description: 'Phone number to call',
            placeholder: '+1234567890',
          },
          {
            name: 'agentId',
            label: 'Agent ID',
            type: 'text',
            required: false,
            description: 'ID of the agent to handle the call',
          },
          {
            name: 'callPurpose',
            label: 'Call Purpose',
            type: 'textarea',
            required: false,
            description: 'Purpose or agenda for the call',
            placeholder: 'Customer support, sales inquiry, etc.',
          },
          {
            name: 'scheduledTime',
            label: 'Scheduled Time',
            type: 'text',
            required: false,
            description: 'Schedule the call for later (ISO format)',
            placeholder: '2024-01-01T10:00:00Z',
          }
        );
        break;

      case 'get_call_details':
        dynamicInputs.push({
          name: 'callId',
          label: 'Call ID',
          type: 'text',
          required: true,
          description: 'ID of the call to get details for',
        });
        break;

      case 'schedule_call':
        dynamicInputs.push(
          {
            name: 'agentId',
            label: 'Agent ID',
            type: 'text',
            required: true,
            description: 'ID of the agent to schedule with',
          },
          {
            name: 'phoneNumber',
            label: 'Phone Number',
            type: 'text',
            required: true,
            description: 'Phone number for the scheduled call',
            placeholder: '+1234567890',
          },
          {
            name: 'scheduledTime',
            label: 'Scheduled Time',
            type: 'text',
            required: true,
            description: 'When to schedule the call (ISO format)',
            placeholder: '2024-01-01T10:00:00Z',
          },
          {
            name: 'duration',
            label: 'Duration (minutes)',
            type: 'number',
            required: false,
            description: 'Expected duration of the call in minutes',
            default: 30,
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
            required: false,
            description: 'Additional notes for the scheduled call',
          }
        );
        break;

      case 'get_call_transcript':
        dynamicInputs.push(
          {
            name: 'callId',
            label: 'Call ID',
            type: 'text',
            required: true,
            description: 'ID of the call to get transcript for',
          },
          {
            name: 'format',
            label: 'Format',
            type: 'select',
            required: false,
            options: [
              { label: 'Text', value: 'text' },
              { label: 'JSON', value: 'json' },
              { label: 'SRT', value: 'srt' },
              { label: 'VTT', value: 'vtt' },
            ],
            description: 'Format of the transcript',
            default: 'text',
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
            description: 'API endpoint path (e.g., /calls/list)',
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
            ],
            description: 'HTTP method for the request',
          },
          {
            name: 'requestBody',
            label: 'Request Body',
            type: 'code',
            language: 'json',
            required: false,
            description: 'JSON request body (for POST/PUT requests)',
          },
          {
            name: 'queryParams',
            label: 'Query Parameters',
            type: 'text',
            required: false,
            description: 'Query parameters (e.g., ?param1=value1&param2=value2)',
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
      description: 'The response data from AI Answer',
    },
    {
      name: 'agents',
      type: 'array',
      description: 'List of agents (for get_agents_list action)',
    },
    {
      name: 'callId',
      type: 'string',
      description: 'ID of the created or queried call',
    },
    {
      name: 'callDetails',
      type: 'object',
      description: 'Call details (for get_call_details action)',
    },
    {
      name: 'transcript',
      type: 'string',
      description: 'Call transcript (for get_call_transcript action)',
    },
    {
      name: 'scheduleId',
      type: 'string',
      description: 'ID of the scheduled call',
    },
    {
      name: 'error',
      type: 'string',
      description: 'Error message if operation failed',
    },
  ],
  async execute(inputs, context) {
    const { apiKey, action, ...actionInputs } = inputs;

    // Resolve variables
    const resolvedApiKey = resolveVariable(apiKey);
    const resolvedInputs = Object.fromEntries(
      Object.entries(actionInputs).map(([key, value]) => [
        key,
        typeof value === 'string' ? resolveVariable(value) : value
      ])
    );

    if (!resolvedApiKey) {
      throw new Error('AI Answer API key is required');
    }

    try {
      const baseUrl = 'https://api.aianswer.com/v1';
      let endpoint = '';
      let method = 'GET';
      let requestBody = null;

      switch (action) {
        case 'get_agents_list':
          endpoint = '/agents';
          const agentParams = new URLSearchParams();
          if (resolvedInputs.gmailAccount) agentParams.append('gmail_account', resolvedInputs.gmailAccount);
          if (resolvedInputs.limit) agentParams.append('limit', resolvedInputs.limit.toString());
          if (agentParams.toString()) endpoint += `?${agentParams.toString()}`;
          break;

        case 'create_phone_call':
          endpoint = '/calls';
          method = 'POST';
          requestBody = {
            phone_number: resolvedInputs.phoneNumber,
          };
          if (resolvedInputs.agentId) requestBody.agent_id = resolvedInputs.agentId;
          if (resolvedInputs.callPurpose) requestBody.purpose = resolvedInputs.callPurpose;
          if (resolvedInputs.scheduledTime) requestBody.scheduled_time = resolvedInputs.scheduledTime;
          break;

        case 'get_call_details':
          endpoint = `/calls/${resolvedInputs.callId}`;
          break;

        case 'schedule_call':
          endpoint = '/calls/schedule';
          method = 'POST';
          requestBody = {
            agent_id: resolvedInputs.agentId,
            phone_number: resolvedInputs.phoneNumber,
            scheduled_time: resolvedInputs.scheduledTime,
          };
          if (resolvedInputs.duration) requestBody.duration = resolvedInputs.duration;
          if (resolvedInputs.notes) requestBody.notes = resolvedInputs.notes;
          break;

        case 'get_call_transcript':
          endpoint = `/calls/${resolvedInputs.callId}/transcript`;
          if (resolvedInputs.format) {
            endpoint += `?format=${resolvedInputs.format}`;
          }
          break;

        case 'custom_api_call':
          endpoint = resolvedInputs.endpoint;
          method = resolvedInputs.method || 'GET';
          if (resolvedInputs.requestBody) {
            try {
              requestBody = JSON.parse(resolvedInputs.requestBody);
            } catch (e) {
              throw new Error('Invalid JSON in request body');
            }
          }
          if (resolvedInputs.queryParams) {
            const queryParams = resolvedInputs.queryParams.startsWith('?') 
              ? resolvedInputs.queryParams.substring(1) 
              : resolvedInputs.queryParams;
            endpoint += `?${queryParams}`;
          }
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // Use Supabase proxy function for AI Answer API calls
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('aianswer-proxy', {
        body: {
          apiKey: resolvedApiKey,
          action,
          ...resolvedInputs
        }
      });

      if (error) {
        throw new Error(`AI Answer proxy error: ${error.message}`);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        data: null,
        agents: null,
        callId: null,
        callDetails: null,
        transcript: null,
        scheduleId: null,
        error: error.message,
      };
    }
  }
};