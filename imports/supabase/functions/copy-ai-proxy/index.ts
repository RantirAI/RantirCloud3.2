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

    const baseUrl = 'https://api.copy.ai/api';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'runWorkflow':
        endpoint = `/workflow/${params.workflowId}/run`;
        body = {
          startVariables: params.startVariables ? JSON.parse(params.startVariables) : {},
          metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
        };
        if (params.webhookUrl) {
          body.webhookUrl = params.webhookUrl;
        }
        break;

      case 'getWorkflowRunStatus':
        endpoint = `/workflow/${params.workflowId}/run/${params.runId}`;
        method = 'GET';
        break;

      case 'getWorkflowRunOutput':
        // Output is included in the run status response when status is COMPLETE
        // Use the same endpoint as getWorkflowRunStatus
        endpoint = `/workflow/${params.workflowId}/run/${params.runId}`;
        method = 'GET';
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Copy.ai: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-copy-ai-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && (contentType.includes('application/json') || contentType.includes('+json'));
    
    if (!isJsonResponse) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (!response.ok) {
          console.error('Copy.ai API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('Copy.ai API - Non-JSON response:', text.substring(0, 500));
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'API returned non-JSON response',
          details: text.substring(0, 200)
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    const data = await response.json();

    if (!response.ok) {
      console.error('Copy.ai API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle polling for completion if requested
    if (action === 'runWorkflow' && params.waitForCompletion === 'true' && data.data?.id) {
      const runId = data.data.id;
      const maxAttempts = 60; // Wait up to 5 minutes
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(`${baseUrl}/workflow/${params.workflowId}/run/${runId}`, {
          method: 'GET',
          headers: {
            'x-copy-ai-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });
        
        if (!statusResponse.ok) break;
        
        const statusData = await statusResponse.json();
        const status = statusData.data?.status;
        
        if (status === 'COMPLETE') {
          return new Response(JSON.stringify({ 
            success: true, 
            data: statusData,
            runId,
            status: 'COMPLETE',
            output: statusData.data?.output || null,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (status === 'FAILED') {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Workflow run failed',
            data: statusData,
            runId,
            status: 'FAILED',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        attempts++;
      }
      
      // Timeout - return current status
      return new Response(JSON.stringify({ 
        success: true, 
        data,
        runId,
        status: 'PROCESSING',
        output: null,
        message: 'Workflow still processing. Use getWorkflowRunStatus to check later.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For getWorkflowRunOutput, extract the output from the response
    if (action === 'getWorkflowRunOutput') {
      return new Response(JSON.stringify({ 
        success: true, 
        data,
        runId: data.data?.id || null,
        status: data.data?.status || null,
        output: data.data?.output || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      runId: data.data?.id || null,
      status: data.data?.status || null,
      output: data.data?.output || data.data || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Copy.ai proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
