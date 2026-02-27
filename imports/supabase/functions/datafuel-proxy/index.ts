import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("DataFuel API key is required");

    const baseUrl = 'https://api.datafuel.dev';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('DataFuel action:', action);

    switch (action) {
      case 'crawlWebsite': {
        const body: Record<string, any> = { url: params.url };
        if (params.maxPages) body.max_pages = Number(params.maxPages);
        if (params.depth) body.depth = Number(params.depth);

        response = await fetch(`${baseUrl}/crawl`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        break;
      }

      case 'scrapeWebsite': {
        const body: Record<string, any> = { url: params.url };
        if (params.selector) body.selector = params.selector;
        if (params.format) body.format = params.format;

        response = await fetch(`${baseUrl}/scrape`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        break;
      }

      case 'getScrape': {
        if (!params.scrapeId) throw new Error('Scrape ID is required');

        const scrapeUrl = new URL(`${baseUrl}/get_scrapes`);
        scrapeUrl.searchParams.set('scrape_id', params.scrapeId);
        response = await fetch(scrapeUrl.toString(), { headers });
        break;
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        const fetchOptions: RequestInit = { method, headers };
        if (params.body && (method === 'POST' || method === 'PUT')) {
          fetchOptions.body = typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
        }

        response = await fetch(`${baseUrl}${path}`, fetchOptions);
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error('DataFuel API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response!.json();
    return new Response(JSON.stringify({ ...result, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('DataFuel proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
