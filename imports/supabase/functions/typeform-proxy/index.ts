import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getErrorMessage } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, method, endpoint, body, queryParams } = await req.json();

    if (!apiKey) {
      throw new Error('API Key is required');
    }

    // Build the API URL
    const baseUrl = 'https://api.typeform.com';
    let url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;

    // Add query parameters if provided
    if (queryParams) {
      const urlParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          urlParams.append(key, String(value));
        }
      });
      
      if (urlParams.toString()) {
        url += `?${urlParams.toString()}`;
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const requestOptions: RequestInit = {
      method: method || 'GET',
      headers
    };

    // Add body for POST, PUT, PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    let result;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    if (!response.ok) {
      throw new Error(`Typeform API error: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({
      result,
      statusCode: response.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in typeform-proxy function:', error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});