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
    const { accessToken, spaceId, environmentId, action, ...params } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: 'Access token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!spaceId) {
      return new Response(JSON.stringify({ success: false, error: 'Space ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const env = environmentId || 'master';
    const deliveryBaseUrl = `https://cdn.contentful.com/spaces/${spaceId}/environments/${env}`;
    const managementBaseUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${env}`;
    
    let endpoint = '';
    let method = 'GET';
    let body: any = null;
    let useManagementApi = false;

    switch (action) {
      case 'searchRecords':
        const searchParams = new URLSearchParams();
        if (params.contentType) {
          searchParams.append('content_type', params.contentType);
        }
        if (params.query) {
          searchParams.append('query', params.query);
        }
        if (params.limit) {
          searchParams.append('limit', params.limit.toString());
        }
        if (params.skip) {
          searchParams.append('skip', params.skip.toString());
        }
        if (params.order) {
          searchParams.append('order', params.order);
        }
        if (params.filters) {
          try {
            const filtersObj = JSON.parse(params.filters);
            Object.entries(filtersObj).forEach(([key, value]) => {
              searchParams.append(key, String(value));
            });
          } catch (e) {
            console.error('Failed to parse filters:', e);
          }
        }
        endpoint = `/entries?${searchParams.toString()}`;
        break;

      case 'getRecord':
        endpoint = `/entries/${params.entryId}`;
        if (params.locale) {
          endpoint += `?locale=${encodeURIComponent(params.locale)}`;
        }
        break;

      case 'createRecord':
        useManagementApi = true;
        endpoint = '/entries';
        method = 'POST';
        body = {
          fields: params.fields ? JSON.parse(params.fields) : {},
        };
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint || '/';
        method = params.method || 'GET';
        useManagementApi = params.useManagementApi === 'true';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const baseUrl = useManagementApi ? managementBaseUrl : deliveryBaseUrl;
    console.log(`Contentful: ${method} ${baseUrl}${endpoint}`);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // For creating entries, we need to specify the content type
    if (action === 'createRecord' && params.contentType) {
      headers['X-Contentful-Content-Type'] = params.contentType;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && (contentType.includes('application/json') || contentType.includes('+json'));
    
    if (!isJsonResponse) {
      const text = await response.text();
      // Try to parse as JSON anyway (some APIs return JSON with wrong content-type)
      try {
        const data = JSON.parse(text);
        // It's valid JSON despite content-type - continue with this data
        if (!response.ok) {
          console.error('Contentful API error:', data);
          return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ 
          success: true, 
          data,
          items: data.items || null,
          total: data.total || null,
          entryId: data.sys?.id || null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('Contentful API - Non-JSON response:', text.substring(0, 500));
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
      console.error('Contentful API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we just created an entry and need to publish it
    if (action === 'createRecord' && params.publish === 'true' && data.sys?.id) {
      const publishResponse = await fetch(
        `${managementBaseUrl}/entries/${data.sys.id}/published`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Contentful-Version': data.sys.version.toString(),
          },
        }
      );
      
      if (!publishResponse.ok) {
        console.error('Failed to publish entry');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      items: data.items || null,
      total: data.total || null,
      entryId: data.sys?.id || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contentful proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
