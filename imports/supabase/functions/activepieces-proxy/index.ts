import { corsHeaders } from '../_shared/cors.ts';

console.log('Activepieces Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Activepieces Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, instanceUrl, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('Activepieces Proxy - API key is missing');
      throw new Error('Activepieces API key is required');
    }

    if (!instanceUrl) {
      console.error('Activepieces Proxy - Instance URL is missing');
      throw new Error('Activepieces instance URL is required');
    }

    console.log(`Activepieces Proxy - Processing action: ${action}`);

    let endpoint = '';
    let method = 'GET';
    let requestBody = null;
    let queryParams = '';

    switch (action) {
      case 'create_flow':
        endpoint = '/v1/flows';
        method = 'POST';
        requestBody = {
          displayName: actionInputs.displayName,
          projectId: actionInputs.projectId,
        };
        break;

      case 'list_flows':
        endpoint = '/v1/flows';
        const flowParams = new URLSearchParams();
        if (actionInputs.projectId) flowParams.append('projectId', actionInputs.projectId);
        if (actionInputs.limit) flowParams.append('limit', actionInputs.limit.toString());
        queryParams = flowParams.toString();
        break;

      case 'get_flow':
        endpoint = `/v1/flows/${actionInputs.flowId}`;
        break;

      case 'update_flow':
        endpoint = `/v1/flows/${actionInputs.flowId}`;
        method = 'POST';
        requestBody = {
          displayName: actionInputs.displayName,
          status: actionInputs.status,
        };
        break;

      case 'delete_flow':
        endpoint = `/v1/flows/${actionInputs.flowId}`;
        method = 'DELETE';
        break;

      case 'create_flow_run':
        endpoint = `/v1/flow-runs`;
        method = 'POST';
        requestBody = {
          flowId: actionInputs.flowId,
          payload: actionInputs.payload ? JSON.parse(actionInputs.payload) : {},
        };
        break;

      case 'list_flow_runs':
        endpoint = '/v1/flow-runs';
        const runParams = new URLSearchParams();
        if (actionInputs.flowId) runParams.append('flowId', actionInputs.flowId);
        if (actionInputs.status) runParams.append('status', actionInputs.status);
        if (actionInputs.limit) runParams.append('limit', actionInputs.limit.toString());
        queryParams = runParams.toString();
        break;

      case 'get_flow_run':
        endpoint = `/v1/flow-runs/${actionInputs.flowRunId}`;
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
        if (actionInputs.queryParams) {
          queryParams = actionInputs.queryParams.startsWith('?') 
            ? actionInputs.queryParams.slice(1) 
            : actionInputs.queryParams;
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    const fullUrl = `${instanceUrl}${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    console.log(`Activepieces Proxy - Making ${method} request to: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Activepieces Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      console.error('Activepieces Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Activepieces Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      flows: Array.isArray(result) && action === 'list_flows' ? result : null,
      flow: !Array.isArray(result) && ['create_flow', 'get_flow', 'update_flow'].includes(action) ? result : null,
      flowRuns: Array.isArray(result) && action === 'list_flow_runs' ? result : null,
      flowRun: !Array.isArray(result) && ['create_flow_run', 'get_flow_run'].includes(action) ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Activepieces Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      flows: null,
      flow: null,
      flowRuns: null,
      flowRun: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});