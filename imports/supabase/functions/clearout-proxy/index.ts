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

    const baseUrl = 'https://api.clearout.io/v2';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'instantVerify':
        endpoint = '/email_verify/instant';
        body = {
          email: params.email,
          timeout: params.timeout || 30,
        };
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

    console.log(`Clearout: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    // Handle instantVerify timeout FIRST (Clearout can return timeout payload with non-2xx status)
    if (action === 'instantVerify' && data?.status === 'failed' && data?.error?.message === 'Timeout occurred') {
      console.log('Clearout: Email verification timed out');
      return new Response(JSON.stringify({
        success: true,
        isValid: false,
        status: 'unknown',
        emailStatus: 'timeout',
        message: 'Email verification timed out. The email server did not respond in time.',
        data,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('Clearout API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle instantVerify action with special timeout handling
    if (action === 'instantVerify') {
      // Handle timeout as a valid "unknown" result
      if (data.status === 'failed' && data.error?.message === 'Timeout occurred') {
        console.log('Clearout: Email verification timed out');
        return new Response(JSON.stringify({ 
          success: true,
          isValid: false,
          status: 'unknown',
          emailStatus: 'timeout',
          message: 'Email verification timed out. The email server did not respond in time.',
          data 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Normal success handling
      if (data.data) {
        const status = data.data.status || '';
        const isValid = ['valid', 'safe'].includes(status.toLowerCase());
        return new Response(JSON.stringify({ 
          success: true, 
          data, 
          isValid, 
          status,
          emailStatus: status,
          message: isValid ? 'Email is valid and safe to send.' : `Email status: ${status}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clearout proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
