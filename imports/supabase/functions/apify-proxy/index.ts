import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, apiToken, actorId, input } = await req.json();
    
    console.log('Apify proxy called with action:', action);

    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    if (!actorId) {
      throw new Error('Actor ID is required');
    }

    let parsedInput = {};
    if (input) {
      try {
        parsedInput = JSON.parse(input);
      } catch (e) {
        throw new Error('Input must be valid JSON');
      }
    }

    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'getDatasetItems':
        endpoint = `https://api.apify.com/v2/acts/${actorId}/runs/last/dataset/items`;
        break;
      case 'getActors':
        endpoint = `https://api.apify.com/v2/acts`;
        break;
      case 'getLastRun':
        endpoint = `https://api.apify.com/v2/acts/${actorId}/runs/last`;
        break;
      case 'startActor':
        endpoint = `https://api.apify.com/v2/acts/${actorId}/runs`;
        method = 'POST';
        body = JSON.stringify(parsedInput);
        break;
      default:
        throw new Error('Invalid action');
    }

    console.log('Apify API call:', method, endpoint);

    const response = await fetch(`${endpoint}?token=${apiToken}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Apify API error:', response.status, errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Apify API success:', result);

    return new Response(JSON.stringify({
      success: true,
      data: result.data || result,
      runId: result.data?.id,
      status: result.data?.status,
      items: Array.isArray(result) ? result : result.data?.items,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Apify proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      runId: null,
      status: null,
      items: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});