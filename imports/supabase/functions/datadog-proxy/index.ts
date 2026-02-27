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
    const { apiKey, site, action, ...params } = await req.json();

    if (!apiKey) throw new Error("Datadog API key is required");

    const baseUrl = `https://api.${site || 'datadoghq.com'}`;
    const headers: Record<string, string> = {
      'DD-API-KEY': apiKey,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('Datadog action:', action);

    switch (action) {
      case 'sendOneLog': {
        const tags = params.tags ? params.tags.split(',').map((t: string) => t.trim()).join(',') : '';
        response = await fetch(`${baseUrl}/api/v2/logs`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            message: params.logMessage,
            ddsource: params.service || 'rantir-flow',
            ddtags: tags,
            status: params.logLevel || 'info',
            service: params.service || 'rantir-flow',
          }]),
        });
        break;
      }

      case 'sendMultipleLogs': {
        let logs: any[];
        try {
          logs = typeof params.logs === 'string' ? JSON.parse(params.logs) : params.logs;
        } catch {
          throw new Error('Invalid JSON for logs array');
        }
        if (!Array.isArray(logs)) throw new Error('Logs must be an array');

        const tags = params.tags ? params.tags.split(',').map((t: string) => t.trim()).join(',') : '';
        const formattedLogs = logs.map((log: any) => ({
          message: log.message || '',
          ddsource: log.service || params.service || 'rantir-flow',
          ddtags: log.tags || tags,
          status: log.level || 'info',
          service: log.service || params.service || 'rantir-flow',
        }));

        response = await fetch(`${baseUrl}/api/v2/logs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(formattedLogs),
        });
        break;
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        if (params.appKey) {
          headers['DD-APPLICATION-KEY'] = params.appKey;
        }

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
      console.error('Datadog API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response!.json();
    return new Response(JSON.stringify({ ...result, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Datadog proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
