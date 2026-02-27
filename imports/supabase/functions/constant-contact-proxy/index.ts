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

    const baseUrl = 'https://api.cc.email/v3';
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createOrUpdateContact':
        if (!params.email) {
          return new Response(JSON.stringify({ success: false, error: 'Email is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = '/contacts/sign_up_form';
        method = 'POST';
        body = {
          email_address: params.email,
          first_name: params.firstName || undefined,
          last_name: params.lastName || undefined,
          list_memberships: params.listId ? [params.listId] : undefined,
        };
        // Remove undefined values
        Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);
        break;

      case 'getContact':
        if (!params.contactId) {
          return new Response(JSON.stringify({ success: false, error: 'Contact ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/contacts/${params.contactId}`;
        break;

      case 'getLists':
        endpoint = '/contact_lists';
        break;

      case 'createList':
        if (!params.listName) {
          return new Response(JSON.stringify({ success: false, error: 'List name is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = '/contact_lists';
        method = 'POST';
        body = {
          name: params.listName,
          description: params.description || undefined,
          favorite: params.favorite || false,
        };
        break;

      case 'deleteContact':
        if (!params.contactId) {
          return new Response(JSON.stringify({ success: false, error: 'Contact ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        endpoint = `/contacts/${params.contactId}`;
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

    console.log(`Constant Contact: ${method} ${baseUrl}${endpoint}`);

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
    if (method === 'DELETE' && response.status === 204) {
      data = { deleted: true };
    } else {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    }

    if (!response.ok) {
      console.error('Constant Contact API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: typeof data === 'object' ? (data.message || data.error_message || 'API request failed') : data,
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response based on action
    let responseData: any = { success: true, data };
    
    if (action === 'createOrUpdateContact') {
      responseData.contactId = data.contact_id;
    } else if (action === 'getLists') {
      responseData.lists = data.lists || data;
    } else if (action === 'createList') {
      responseData.listId = data.list_id;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Constant Contact proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
