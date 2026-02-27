import { corsHeaders } from '../_shared/cors.ts';

console.log('AgentX Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`AgentX Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('AgentX Proxy - API key is missing');
      throw new Error('AgentX API key is required');
    }

    console.log(`AgentX Proxy - Processing action: ${action}`);

    const baseUrl = 'https://api.agentx.dev';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'create_agent':
        endpoint = '/api/v1/agents';
        method = 'POST';
        requestBody = {
          name: actionInputs.agentName,
          description: actionInputs.description || '',
          model: actionInputs.model || 'gpt-3.5-turbo',
          prompt: actionInputs.prompt || '',
          tools: actionInputs.tools ? actionInputs.tools.split(',') : [],
        };
        break;

      case 'get_agents':
        endpoint = '/api/v1/agents';
        break;

      case 'get_agent':
        endpoint = `/api/v1/agents/${actionInputs.agentId}`;
        break;

      case 'update_agent':
        endpoint = `/api/v1/agents/${actionInputs.agentId}`;
        method = 'PUT';
        requestBody = {
          name: actionInputs.agentName,
          description: actionInputs.description || '',
          model: actionInputs.model || 'gpt-3.5-turbo',
          prompt: actionInputs.prompt || '',
          tools: actionInputs.tools ? actionInputs.tools.split(',') : [],
        };
        break;

      case 'delete_agent':
        endpoint = `/api/v1/agents/${actionInputs.agentId}`;
        method = 'DELETE';
        break;

      case 'run_agent':
        endpoint = `/api/v1/agents/${actionInputs.agentId}/run`;
        method = 'POST';
        requestBody = {
          input: actionInputs.input,
          context: actionInputs.context || {},
          max_tokens: actionInputs.maxTokens ? parseInt(actionInputs.maxTokens) : 1000,
        };
        break;

      case 'get_runs':
        endpoint = `/api/v1/agents/${actionInputs.agentId}/runs`;
        break;

      case 'get_run':
        endpoint = `/api/v1/agents/${actionInputs.agentId}/runs/${actionInputs.runId}`;
        break;

      case 'create_workflow':
        endpoint = '/api/v1/workflows';
        method = 'POST';
        requestBody = {
          name: actionInputs.workflowName,
          description: actionInputs.description || '',
          steps: actionInputs.steps ? JSON.parse(actionInputs.steps) : [],
        };
        break;

      case 'get_workflows':
        endpoint = '/api/v1/workflows';
        break;

      case 'run_workflow':
        endpoint = `/api/v1/workflows/${actionInputs.workflowId}/run`;
        method = 'POST';
        requestBody = {
          input: actionInputs.input,
          variables: actionInputs.variables ? JSON.parse(actionInputs.variables) : {},
        };
        break;

      case 'get_tools':
        endpoint = '/api/v1/tools';
        break;

      case 'custom_api_call':
        endpoint = actionInputs.endpoint;
        method = actionInputs.method || 'GET';
        if (actionInputs.requestBody) {
          try {
            requestBody = JSON.parse(actionInputs.requestBody);
          } catch (error) {
            throw new Error('Invalid JSON in request body');
          }
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`AgentX Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`AgentX Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      console.error('AgentX Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('AgentX Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      agents: Array.isArray(result) && action === 'get_agents' ? result : null,
      agent: !Array.isArray(result) && ['create_agent', 'get_agent', 'update_agent'].includes(action) ? result : null,
      runs: Array.isArray(result) && action === 'get_runs' ? result : null,
      run: !Array.isArray(result) && ['run_agent', 'get_run'].includes(action) ? result : null,
      workflows: Array.isArray(result) && action === 'get_workflows' ? result : null,
      workflow: !Array.isArray(result) && ['create_workflow'].includes(action) ? result : null,
      workflowRun: !Array.isArray(result) && action === 'run_workflow' ? result : null,
      tools: Array.isArray(result) && action === 'get_tools' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('AgentX Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      agents: null,
      agent: null,
      runs: null,
      run: null,
      workflows: null,
      workflow: null,
      workflowRun: null,
      tools: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});