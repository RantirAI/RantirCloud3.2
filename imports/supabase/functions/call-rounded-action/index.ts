import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { apiKey, method, endpoint, body, queryParams } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Default method to GET if not provided
    const reqMethod = method || 'GET';

    if (!endpoint) {
      throw new Error('API endpoint is required');
    }

    // Build the full URL
    const baseUrl = 'https://api.callrounded.com';
    let url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;

    // Add query parameters if provided
    if (queryParams) {
      const params = new URLSearchParams(
        typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams
      );
      url += `?${params.toString()}`;
    }

    console.log(`CallRounded: ${reqMethod} ${url}`);

    // Prepare request options
    const options: RequestInit = {
      method: reqMethod,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST, PUT, PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(reqMethod)) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CallRounded API error:', errorText);
      throw new Error(`CallRounded API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in call-rounded-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
