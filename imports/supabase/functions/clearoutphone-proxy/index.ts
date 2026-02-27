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

    const baseUrl = 'https://api.clearoutphone.io/v1';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'validatePhoneNumber':
        // POST /phonenumber/validate - validates phone number and returns all info including line_type, carrier
        endpoint = '/phonenumber/validate';
        body = {
          number: params.phoneNumber, // API expects 'number' not 'phone_number'
          country_code: params.countryCode || '',
        };
        break;

      case 'findPhoneNumberCarrier':
        // Uses validate endpoint - carrier info is included in the response
        endpoint = '/phonenumber/validate';
        body = {
          number: params.phoneNumber,
          country_code: params.countryCode || '',
        };
        break;

      case 'findPhoneNumberIsMobile':
        // Uses validate endpoint - line_type info is included in the response
        endpoint = '/phonenumber/validate';
        body = {
          number: params.phoneNumber,
          country_code: params.countryCode || '',
        };
        break;

      case 'bulkValidate':
        // POST /phonenumber/bulk - bulk validation
        endpoint = '/phonenumber/bulk';
        body = {
          phone_numbers: params.phoneNumbers || [],
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

    console.log(`ClearoutPhone: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer:${apiKey}`, // ClearoutPhone uses Bearer:token format (colon, not space)
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('ClearoutPhone API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || data.error || 'API request failed',
        details: data,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format response based on action
    if (action === 'validatePhoneNumber') {
      const isValid = data.status === 'valid';
      const lineType = data.line_type || 'unknown';
      return new Response(JSON.stringify({
        success: true,
        data,
        isValid,
        lineType,
        status: data.status,
        message: isValid ? 'Phone number is valid.' : `Phone status: ${data.status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'findPhoneNumberCarrier') {
      // Extract carrier-specific info from validate response
      return new Response(JSON.stringify({
        success: true,
        data: {
          carrier: data.carrier || null,
          network_type: data.network_type || null,
          mcc: data.mcc || null,
          mnc: data.mnc || null,
        },
        carrier: data.carrier || data.network_name || 'Unknown',
        lineType: data.line_type || 'unknown',
        message: `Carrier: ${data.carrier || data.network_name || 'Unknown'}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'findPhoneNumberIsMobile') {
      // Extract line_type info from validate response
      const isMobile = data.line_type === 'mobile';
      return new Response(JSON.stringify({
        success: true,
        data: {
          is_mobile: isMobile,
          line_type: data.line_type || null,
        },
        isMobile,
        lineType: data.line_type || 'unknown',
        message: isMobile ? 'Phone number is mobile.' : `Phone type: ${data.line_type || 'unknown'}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ClearoutPhone proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
