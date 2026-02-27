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
    const { baseUrl, email, apiToken, action, ...params } = await req.json();

    if (!baseUrl || !email || !apiToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Confluence URL, email, and API token are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up base URL
    let cleanBaseUrl = baseUrl.trim().replace(/\/$/, '');
    if (!cleanBaseUrl.startsWith('http')) {
      cleanBaseUrl = `https://${cleanBaseUrl}`;
    }

    const apiBase = `${cleanBaseUrl}/wiki/rest/api`;
    const authHeader = `Basic ${btoa(`${email}:${apiToken}`)}`;

    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'getPageContent':
        if (!params.pageId) {
          return new Response(JSON.stringify({ success: false, error: 'Page ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/content/${params.pageId}`;
        if (params.expand) {
          endpoint += `?expand=${params.expand}`;
        } else {
          endpoint += '?expand=body.storage,version';
        }
        break;

      case 'createPageFromTemplate':
        if (!params.spaceKey || !params.title || !params.content) {
          return new Response(JSON.stringify({ success: false, error: 'Space key, title, and content are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = '/content';
        method = 'POST';
        body = {
          type: 'page',
          title: params.title,
          space: { key: params.spaceKey },
          body: {
            storage: {
              value: params.content,
              representation: 'storage'
            }
          }
        };
        if (params.parentId) {
          body.ancestors = [{ id: params.parentId }];
        }
        if (params.templateId) {
          // Note: Template application in Confluence API may vary
          body.metadata = {
            properties: {
              'content-appearance-draft': { value: 'full-width' }
            }
          };
        }
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Confluence: ${method} ${apiBase}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${apiBase}${endpoint}`, fetchOptions);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      console.error('Confluence API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: typeof data === 'object' ? (data.message || data.error || 'API request failed') : data,
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response based on action
    let responseData: any = { success: true, data };
    
    if (action === 'getPageContent') {
      responseData.page = data;
      responseData.content = data.body?.storage?.value || '';
    } else if (action === 'createPageFromTemplate') {
      responseData.page = data;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Confluence proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
