import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, apiKey, endpoint, method, requestBody } = await req.json();
    
    console.log('Ashby proxy called with action:', action, 'endpoint:', endpoint);

    if (!apiKey) {
      throw new Error('Ashby API key is required');
    }

    if (action === 'custom_api_call') {
      if (!endpoint) {
        throw new Error('API endpoint is required');
      }

      let parsedBody = null;
      if (requestBody) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          throw new Error('Request body must be valid JSON');
        }
      }

      const baseUrl = 'https://api.ashbyhq.com';
      const fullEndpoint = `${baseUrl}/${endpoint}`;

      // Create base64 encoded auth header
      const auth = btoa(`${apiKey}:`);

      const response = await fetch(fullEndpoint, {
        method: method || 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: parsedBody ? JSON.stringify(parsedBody) : null,
      });

      const result = await response.json();
      console.log('Ashby API response:', response.status, result);

      return new Response(JSON.stringify({
        success: response.ok,
        data: result,
        statusCode: response.status,
        error: response.ok ? null : `API error: ${response.status}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Ashby proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});