import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("DatoCMS API token is required");

    const cmaBaseUrl = 'https://site-api.datocms.com';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Api-Version': '3',
    };

    let response: Response;

    console.log('DatoCMS action:', action);

    switch (action) {
      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        // Merge custom headers if provided
        const customHeaders = params.headers
          ? (typeof params.headers === 'string' ? JSON.parse(params.headers) : params.headers)
          : {};

        const fetchOptions: RequestInit = {
          method,
          headers: { ...headers, ...customHeaders },
        };
        if (params.body && (method === 'POST' || method === 'PUT')) {
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }

        response = await fetch(`${cmaBaseUrl}${path}`, fetchOptions);
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error('DatoCMS API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    const contentType = response!.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      result = await response!.json();
    } else {
      result = { message: 'Operation completed successfully' };
    }

    return new Response(JSON.stringify({ ...result, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('DatoCMS proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
