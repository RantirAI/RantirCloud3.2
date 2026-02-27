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

    const baseUrl = 'https://www.cognitoforms.com/api';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'getForms':
        endpoint = '/forms';
        break;

      case 'getFormEntries':
        if (!params.formId) {
          return new Response(JSON.stringify({ success: false, error: 'Form ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/forms/${params.formId}/entries`;
        break;

      case 'createEntry':
        if (!params.formId) {
          return new Response(JSON.stringify({ success: false, error: 'Form ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/forms/${params.formId}/entries`;
        method = 'POST';
        body = typeof params.entryData === 'string' ? JSON.parse(params.entryData) : params.entryData;
        break;

      case 'updateEntry':
        if (!params.formId || !params.entryId) {
          return new Response(JSON.stringify({ success: false, error: 'Form ID and Entry ID are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/forms/${params.formId}/entries/${params.entryId}`;
        method = 'PUT';
        body = typeof params.entryData === 'string' ? JSON.parse(params.entryData) : params.entryData;
        break;

      case 'deleteEntry':
        if (!params.formId || !params.entryId) {
          return new Response(JSON.stringify({ success: false, error: 'Form ID and Entry ID are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/forms/${params.formId}/entries/${params.entryId}`;
        method = 'DELETE';
        break;

      case 'customApiCall':
        endpoint = params.endpoint;
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

    console.log(`Cognito Forms: ${method} ${baseUrl}${endpoint}`);

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
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      console.error('Cognito Forms API error:', data);
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
    
    if (action === 'getForms') {
      responseData.forms = Array.isArray(data) ? data : [data];
    } else if (action === 'getFormEntries') {
      responseData.entries = Array.isArray(data) ? data : [data];
    } else if (action === 'createEntry' || action === 'updateEntry') {
      responseData.entry = data;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cognito Forms proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
