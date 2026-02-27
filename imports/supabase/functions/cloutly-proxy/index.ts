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

    const baseUrl = 'https://api.cloutly.com/v1';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'sendReviewInvite':
        endpoint = '/review-requests';
        body = {
          customer_email: params.customerEmail,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          template_id: params.templateId,
          send_immediately: params.sendImmediately !== false,
          custom_message: params.customMessage || undefined,
        };
        break;

      case 'getReviews':
        endpoint = '/reviews';
        method = 'GET';
        break;

      case 'getReviewStats':
        endpoint = '/reviews/stats';
        method = 'GET';
        break;

      case 'getContacts':
        endpoint = '/contacts';
        method = 'GET';
        break;

      case 'createContact':
        endpoint = '/contacts';
        body = {
          email: params.email,
          name: params.name,
          phone: params.phone,
          tags: params.tags || [],
        };
        break;

      case 'getTemplates':
        endpoint = '/templates';
        method = 'GET';
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Cloutly: ${method} ${baseUrl}${endpoint}`);

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
    const data = await response.json();

    if (!response.ok) {
      console.error('Cloutly API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sendReviewInvite') {
      return new Response(JSON.stringify({
        success: true,
        data,
        inviteId: data.id,
        status: data.status,
        message: 'Review invite sent successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cloutly proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
