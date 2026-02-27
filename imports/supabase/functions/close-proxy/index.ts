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

    const baseUrl = 'https://api.close.com/api/v1';
    const authHeader = 'Basic ' + btoa(`${apiKey}:`);
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createLead':
        endpoint = '/lead/';
        method = 'POST';
        body = {
          name: params.name,
          url: params.url,
          description: params.description,
          status_id: params.statusId,
          contacts: params.contacts ? JSON.parse(params.contacts) : undefined,
        };
        break;

      case 'createContact':
        endpoint = '/contact/';
        method = 'POST';
        body = {
          lead_id: params.leadId,
          name: params.name,
          title: params.title,
          emails: params.email ? [{ email: params.email, type: 'office' }] : undefined,
          phones: params.phone ? [{ phone: params.phone, type: 'office' }] : undefined,
        };
        break;

      case 'findLead': {
        const queryParams = new URLSearchParams();
        queryParams.append('query', params.query);
        if (params.limit) queryParams.append('_limit', params.limit.toString());
        endpoint = `/lead/?${queryParams.toString()}`;
        method = 'GET';
        break;
      }

      case 'createOpportunity':
        endpoint = '/opportunity/';
        method = 'POST';
        body = {
          lead_id: params.leadId,
          status_id: params.statusId,
          value: params.value,
          value_period: params.valuePeriod,
          confidence: params.confidence,
          note: params.note,
        };
        break;

      case 'findContact': {
        const queryParams = new URLSearchParams();
        queryParams.append('query', params.query);
        if (params.limit) queryParams.append('_limit', params.limit.toString());
        endpoint = `/contact/?${queryParams.toString()}`;
        method = 'GET';
        break;
      }

      case 'customApiCall':
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

    console.log(`Close: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Close API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.error || data.message || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Close proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
