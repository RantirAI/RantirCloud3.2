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

    const baseUrl = 'https://app.chatsistant.com/api/v1';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'sendMessage':
        // First create session if no sessionId provided
        if (!params.sessionId) {
          const sessionEndpoint = `/chatbot/${params.chatbotUuid}/session/create`;
          console.log(`Chatsistant: Creating session at ${baseUrl}${sessionEndpoint}`);
          
          const sessionResponse = await fetch(`${baseUrl}${sessionEndpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          
          // Check for non-JSON response on session creation
          const sessionContentType = sessionResponse.headers.get('content-type');
          if (!sessionContentType || !sessionContentType.includes('application/json')) {
            const text = await sessionResponse.text();
            console.error('Chatsistant session creation - Non-JSON response:', text.substring(0, 500));
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'API returned non-JSON response during session creation. Possible incorrect endpoint or authentication issue.',
              details: text.substring(0, 200)
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const sessionData = await sessionResponse.json();
          
          if (!sessionResponse.ok) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Failed to create session', 
              details: sessionData 
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Use uuid as session ID (correct field based on ActivePieces implementation)
          params.sessionId = sessionData.uuid || sessionData.session_id || sessionData.id;
        }
        
        // Now send message to session - use 'query' parameter instead of 'message'
        endpoint = `/session/${params.sessionId}/message/stream`;
        body = {
          query: params.message,  // Fixed: use 'query' not 'message'
        };
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint || '/';
        method = params.method || 'POST';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Chatsistant: ${method} ${baseUrl}${endpoint}`);

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
    
    // Handle streaming response or check for non-JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('text/event-stream') || contentType?.includes('text/plain')) {
      const text = await response.text();
      data = { response: text };
    } else if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Chatsistant API - Non-JSON response:', text.substring(0, 500));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API returned non-JSON response. Possible incorrect endpoint or authentication issue.',
        details: text.substring(0, 200)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      data = await response.json();
    }

    if (!response.ok) {
      console.error('Chatsistant API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      response: data.response || data.message || data.text,
      sessionId: params.sessionId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chatsistant proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
