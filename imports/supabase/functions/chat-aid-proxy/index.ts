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

    const baseUrl = 'https://api.chataid.com';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'addCustomSources':
        // Correct endpoint: /external/sources/custom
        endpoint = '/external/sources/custom';
        if (params.teamId) {
          endpoint += `?team_id=${encodeURIComponent(params.teamId)}`;
        }
        method = 'POST';
        // Note: This action typically requires file uploads via FormData
        // For now, we support the basic structure
        body = params.files ? { files: params.files } : null;
        break;

      case 'askQuestions':
        // Correct endpoint: /chat/completions/custom
        endpoint = '/chat/completions/custom';
        method = 'POST';
        body = {
          prompt: params.prompt || params.question, // Support both field names
        };
        if (params.parentTs) {
          body.parentTs = params.parentTs;
        }
        if (params.messageTs) {
          body.messageTs = params.messageTs;
        }
        break;

      case 'getCustomSourceById':
        // Correct endpoint: /external/sources/custom/{sourceId}
        endpoint = `/external/sources/custom/${params.sourceId}`;
        method = 'GET';
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint || '/';
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Chat-Aid: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Check for non-JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Chat-Aid API - Non-JSON response:', text.substring(0, 500));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API returned non-JSON response. Possible incorrect endpoint or authentication issue.',
        details: text.substring(0, 200)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();

    if (!response.ok) {
      console.error('Chat-Aid API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat-Aid proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
