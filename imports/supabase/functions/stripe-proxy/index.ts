import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    console.log(`[Stripe Proxy] Action: ${action}`);

    if (!apiKey) {
      throw new Error("Missing Stripe API key");
    }

    let url = 'https://api.stripe.com/v1';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'createCustomer':
        url = `${url}/customers`;
        method = 'POST';
        body = new URLSearchParams({
          name: params.name,
          email: params.email || '',
          description: params.description || ''
        });
        break;
        
      case 'updateCustomer':
        url = `${url}/customers/${params.customerId}`;
        method = 'POST';
        body = new URLSearchParams({
          name: params.name || '',
          email: params.email || '',
          description: params.description || ''
        });
        break;
        
      case 'createPaymentIntent':
        url = `${url}/payment_intents`;
        method = 'POST';
        body = new URLSearchParams({
          amount: params.amount.toString(),
          currency: params.currency,
          customer: params.customerId || ''
        });
        break;
        
      case 'createSubscription':
        url = `${url}/subscriptions`;
        method = 'POST';
        const subParams = new URLSearchParams({
          customer: params.customerId,
        });
        subParams.append('items[0][price]', params.priceId);
        if (params.quantity) {
          subParams.append('items[0][quantity]', params.quantity.toString());
        }
        body = subParams;
        break;
        
      case 'createProduct':
        url = `${url}/products`;
        method = 'POST';
        body = new URLSearchParams({
          name: params.name,
          description: params.description || ''
        });
        break;
        
      case 'createPrice':
        url = `${url}/prices`;
        method = 'POST';
        const priceParams = new URLSearchParams({
          product: params.productId,
          unit_amount: params.unitAmount.toString(),
          currency: params.currency
        });
        if (params.recurring) {
          priceParams.append('recurring[interval]', params.recurring.interval);
        }
        body = priceParams;
        break;
        
      case 'createRefund':
        url = `${url}/refunds`;
        method = 'POST';
        body = new URLSearchParams({
          payment_intent: params.paymentIntentId,
          amount: params.amount?.toString() || ''
        });
        break;
        
      case 'createPaymentLink':
        url = `${url}/payment_links`;
        method = 'POST';
        body = new URLSearchParams();
        body.append('line_items[0][price]', params.priceId);
        body.append('line_items[0][quantity]', params.quantity.toString());
        break;
        
      case 'retrieveCustomer':
        url = `${url}/customers/${params.customerId}`;
        method = 'GET';
        break;
        
      case 'searchCustomer':
        url = `${url}/customers/search?query=${encodeURIComponent(params.query)}`;
        method = 'GET';
        break;
        
      case 'createInvoice':
        url = `${url}/invoices`;
        method = 'POST';
        body = new URLSearchParams({
          customer: params.customerId,
          auto_advance: params.autoAdvance?.toString() || 'false'
        });
        if (params.daysUntilDue) {
          body.append('days_until_due', params.daysUntilDue.toString());
        }
        break;
        
      case 'searchSubscriptions':
        url = `${url}/subscriptions/search?query=${encodeURIComponent(params.query)}`;
        method = 'GET';
        break;
        
      case 'customApiCall':
        // Strip /v1/ prefix if present to avoid duplication
        let endpoint = params.endpoint.trim();
        endpoint = endpoint.replace(/^\/+v1\/+/, '').replace(/^\/+/, '');
        url = `${url}/${endpoint}`;
        method = params.method || 'GET';
        if (params.body && method !== 'GET') {
          if (typeof params.body === 'object') {
            body = new URLSearchParams(params.body);
          } else {
            body = params.body;
          }
        }
        if (params.queryParams) {
          const searchParams = new URLSearchParams(params.queryParams);
          url += `?${searchParams.toString()}`;
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Stripe Proxy] API Error ${response.status}: ${errorText}`);
      
      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Authentication failed. Please verify your Stripe API key is correct and has the necessary permissions.');
      }
      
      if (response.status === 404) {
        throw new Error(`Resource not found. Please check the resource ID or endpoint.`);
      }
      
      throw new Error(`Stripe API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    return new Response(JSON.stringify({
      result,
      id: result.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe proxy error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});