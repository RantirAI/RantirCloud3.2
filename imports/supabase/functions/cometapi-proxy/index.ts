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
      return new Response(JSON.stringify({ success: false, error: 'API token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Correct CometAPI base URL
    const baseUrl = 'https://api.cometapi.com/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'askCometApi':
        if (!params.query) {
          return new Response(JSON.stringify({ success: false, error: 'Query is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Use OpenAI-compatible chat completions endpoint
        endpoint = '/chat/completions';
        method = 'POST';
        body = {
          model: params.model || 'gpt-4o-mini',
          messages: [
            ...(params.context ? [{ role: 'system', content: params.context }] : []),
            { role: 'user', content: params.query }
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2048,
        };
        break;

      case 'createCustomApiCall':
        if (!params.endpoint) {
          return new Response(JSON.stringify({ success: false, error: 'Endpoint is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = params.endpoint.startsWith('/') ? params.endpoint : `/${params.endpoint}`;
        method = params.method || 'GET';
        if (params.body) {
          body = typeof params.body === 'string' ? JSON.parse(params.body) : params.body;
        }
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`CometAPI: ${method} ${baseUrl}${endpoint}`);

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
    
    // Handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type') || '';
    let data: any;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textResponse = await response.text();
      console.error('CometAPI returned non-JSON response:', textResponse.substring(0, 200));
      return new Response(JSON.stringify({
        success: false,
        error: 'API returned an invalid response. Please check your API key and endpoint.',
        details: { status: response.status, statusText: response.statusText }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('CometAPI error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response based on action
    let responseData: any = { success: true, data };
    
    if (action === 'askCometApi') {
      // Extract the assistant's message from OpenAI-style response
      const assistantMessage = data.choices?.[0]?.message?.content;
      responseData.response = assistantMessage || data.response || data.answer || data.result;
      responseData.usage = data.usage;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CometAPI proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
