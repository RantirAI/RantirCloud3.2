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

    const baseUrl = 'https://api.contiguity.co/send';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'sendText':
        endpoint = '/text';
        body = {
          to: params.to,
          message: params.message,
          from: params.from || undefined,
          media_url: params.mediaUrl || undefined,
          callback_url: params.callbackUrl || undefined,
        };
        break;

      case 'send_iMessage':
        // iMessage uses the /text endpoint with beta_features.imessage = true
        endpoint = '/text';
        body = {
          to: params.to,
          message: params.message,
          beta_features: {
            imessage: true,
            from: params.from || undefined,  // Sender's phone number for iMessage
            fallback: params.fallback === 'true' || params.fallback === true,  // SMS fallback
          },
          media_url: params.mediaUrl || undefined,
          callback_url: params.callbackUrl || undefined,
        };
        break;

      case 'createCustomApiCall':
        // For custom API calls, use the base contiguity API
        const customBaseUrl = 'https://api.contiguity.co';
        endpoint = params.endpoint || '/';
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;

        console.log(`Contiguity Custom: ${method} ${customBaseUrl}${endpoint}`);

        const customFetchOptions: RequestInit = {
          method,
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
        };

        if (body && method !== 'GET') {
          customFetchOptions.body = JSON.stringify(body);
        }

        const customResponse = await fetch(`${customBaseUrl}${endpoint}`, customFetchOptions);
        
        const customContentType = customResponse.headers.get('content-type');
        const isCustomJsonResponse = customContentType && (customContentType.includes('application/json') || customContentType.includes('+json'));
        
        if (!isCustomJsonResponse) {
          const text = await customResponse.text();
          try {
            const customData = JSON.parse(text);
            if (!customResponse.ok) {
              return new Response(JSON.stringify({ success: false, error: customData.message || customData.error || 'API request failed', details: customData }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            return new Response(JSON.stringify({ success: true, data: customData }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch {
            console.error('Contiguity API - Non-JSON response:', text.substring(0, 500));
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
        
        const customData = await customResponse.json();

        if (!customResponse.ok) {
          console.error('Contiguity API error:', customData);
          return new Response(JSON.stringify({ success: false, error: customData.message || customData.error || 'API request failed', details: customData }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          data: customData,
          messageId: customData.id || customData.message_id || null,
          status: customData.status || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Contiguity: ${method} ${baseUrl}${endpoint}`);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Token ${apiKey}`,
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
          console.error('Contiguity API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('Contiguity API - Non-JSON response:', text.substring(0, 500));
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
      console.error('Contiguity API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      messageId: data.id || data.message_id || null,
      status: data.status || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contiguity proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
