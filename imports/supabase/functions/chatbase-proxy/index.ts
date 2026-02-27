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

    const baseUrl = 'https://www.chatbase.co/api/v1';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createChatbot':
        endpoint = '/chatbots';
        method = 'POST';
        body = {
          name: params.name,
        };
        if (params.sourceText) {
          body.sourceText = params.sourceText;
        }
        if (params.urlsToScrape) {
          body.urlsToScrape = params.urlsToScrape.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
        break;

      case 'sendPromptToChatbot':
        endpoint = '/chat';
        method = 'POST';
        body = {
          chatbotId: params.chatbotId,
          messages: [
            {
              role: 'user',
              content: params.message,
            }
          ],
        };
        if (params.conversationId) {
          body.conversationId = params.conversationId;
        }
        break;

      case 'searchConversations':
        if (!params.chatbotId) {
          return new Response(JSON.stringify({ success: false, error: 'chatbotId is required for searchConversations' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/chatbots/${params.chatbotId}/conversations`;
        method = 'GET';
        const queryParams = [];
        if (params.query) queryParams.push(`query=${encodeURIComponent(params.query)}`);
        if (params.startDate) queryParams.push(`startDate=${encodeURIComponent(params.startDate)}`);
        if (params.endDate) queryParams.push(`endDate=${encodeURIComponent(params.endDate)}`);
        if (queryParams.length > 0) {
          endpoint += `?${queryParams.join('&')}`;
        }
        break;

      case 'listChatbots':
        endpoint = '/chatbots';
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

    console.log(`Chatbase: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Check for non-JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Chatbase API - Non-JSON response:', text.substring(0, 500));
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
      console.error('Chatbase API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      chatbotId: data.chatbotId || data.id,
      response: data.text || data.response || data.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chatbase proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
