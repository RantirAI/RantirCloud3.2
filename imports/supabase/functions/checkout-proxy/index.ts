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
    const { apiKey, environment, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Secret key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine base URL based on environment
    const baseUrl = environment === 'production' 
      ? 'https://api.checkout.com' 
      : 'https://api.sandbox.checkout.com';
    
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'createCustomer':
        endpoint = '/customers';
        body = {
          email: params.email,
          name: params.name,
          phone: params.phone ? { number: params.phone } : undefined,
          metadata: params.metadata ? JSON.parse(params.metadata) : undefined,
        };
        break;

      case 'updateCustomer':
        endpoint = `/customers/${params.customerId}`;
        method = 'PATCH';
        body = {};
        if (params.email) body.email = params.email;
        if (params.name) body.name = params.name;
        if (params.phone) body.phone = { number: params.phone };
        if (params.metadata) body.metadata = JSON.parse(params.metadata);
        break;

      case 'createPaymentLink':
        endpoint = '/payment-links';
        body = {
          amount: params.amount,
          currency: params.currency || 'USD',
          reference: params.reference,
          description: params.description,
          return_url: params.successUrl,
          ...(params.cancelUrl && { processing_channel_id: params.cancelUrl }),
        };
        break;

      case 'createPayout':
        endpoint = '/transfers';
        body = {
          source: { 
            type: 'entity',
            id: params.sourceEntityId
          },
          destination: { 
            type: 'entity',
            id: params.destinationEntityId
          },
          amount: params.amount,
          currency: params.currency || 'USD',
          reference: params.reference,
        };
        break;

      case 'refundPayment':
        endpoint = `/payments/${params.paymentId}/refunds`;
        body = {};
        if (params.amount) body.amount = params.amount;
        if (params.reference) body.reference = params.reference;
        break;

      case 'getPaymentDetails':
      case 'getPayment':
        endpoint = `/payments/${params.paymentId}`;
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

    console.log(`Checkout.com: ${method} ${baseUrl}${endpoint}`);

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
      console.error('Checkout.com API error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message || data.error_type || 'API request failed', details: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout.com proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
