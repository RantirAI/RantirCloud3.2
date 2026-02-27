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

    const baseUrl = 'https://api.chat-data.com';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'createChatbot':
        endpoint = '/api/v2/create-chatbot';
        body = {
          chatbotName: params.name,
          sourceText: params.sourceText,
          model: params.model || 'gpt-3.5-turbo',
        };
        break;

      case 'deleteChatbot':
        // DELETE method with chatbotId in path
        if (!params.chatbotId) {
          return new Response(JSON.stringify({ success: false, error: 'chatbotId is required for deleteChatbot' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/api/v2/delete-chatbot/${params.chatbotId}`;
        method = 'DELETE';
        body = null;
        break;

      case 'sendMessage':
        endpoint = '/api/v2/chat';
        body = {
          chatbotId: params.chatbotId,
          messages: [
            {
              role: 'user',
              content: params.message,
            }
          ],
          conversationId: params.conversationId,
        };
        break;

      case 'updateBasePrompt':
        endpoint = '/api/v2/update-chatbot-settings';
        body = {
          chatbotId: params.chatbotId,
          basePrompt: params.basePrompt,
        };
        break;

      case 'retrainChatbot':
        endpoint = '/api/v2/retrain-chatbot';
        body = {
          chatbotId: params.chatbotId,
        };
        // Add optional parameters if provided
        if (params.sourceText) {
          body.sourceText = params.sourceText;
        }
        if (params.urlsToScrape) {
          // Parse comma-separated URLs into array
          body.urlsToScrape = params.urlsToScrape.split(',').map((url: string) => url.trim()).filter(Boolean);
        }
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

    console.log(`Chat-Data: ${method} ${baseUrl}${endpoint}`);

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
      console.error('Chat-Data API - Non-JSON response:', text.substring(0, 500));
      
      // For DELETE requests, empty response might be success
      if (method === 'DELETE' && response.ok) {
        return new Response(JSON.stringify({ 
          success: true, 
          data: { message: 'Chatbot deleted successfully' },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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
      console.error('Chat-Data API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      chatbotId: data.chatbotId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat-Data proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
