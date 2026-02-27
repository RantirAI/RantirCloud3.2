import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://comfy.icu/api/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'submitWorkflowRun':
        if (!params.workflowId) {
          return new Response(JSON.stringify({ success: false, error: 'Workflow ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/workflows/${params.workflowId}/runs`;
        method = 'POST';
        body = {
          prompt: params.prompt ? (typeof params.prompt === 'string' ? JSON.parse(params.prompt) : params.prompt) : {},
        };
        if (params.webhook) {
          body.webhook = params.webhook;
        }
        break;

      case 'getRunStatus':
        if (!params.workflowId) {
          return new Response(JSON.stringify({ success: false, error: 'Workflow ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!params.runId) {
          return new Response(JSON.stringify({ success: false, error: 'Run ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/workflows/${params.workflowId}/runs/${params.runId}`;
        break;

      case 'getRunOutput':
        if (!params.workflowId) {
          return new Response(JSON.stringify({ success: false, error: 'Workflow ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!params.runId) {
          return new Response(JSON.stringify({ success: false, error: 'Run ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/workflows/${params.workflowId}/runs/${params.runId}/outputs`;
        break;

      case 'listWorkflows':
        endpoint = '/workflows';
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Comfy ICU: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Comfy ICU API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response based on action
    let responseData: any = { success: true, data };
    
    if (action === 'submitWorkflowRun') {
      responseData.runId = data.id || data.run_id;
      responseData.status = data.status;
    } else if (action === 'getRunStatus') {
      responseData.status = data.status;
      responseData.runId = data.id;
    } else if (action === 'getRunOutput') {
      responseData.outputs = data.outputs || data;
    } else if (action === 'listWorkflows') {
      responseData.workflows = data.workflows || data;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Comfy ICU proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
