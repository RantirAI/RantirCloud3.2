import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("DeepL API key is required");

    const isFreeKey = apiKey.endsWith(':fx');
    const baseUrl = isFreeKey
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const headers: Record<string, string> = {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('[DeepL] Action:', action);

    switch (action) {
      case 'translateText': {
        const body: any = {
          text: Array.isArray(params.text) ? params.text : [params.text],
          target_lang: params.targetLang,
        };
        if (params.sourceLang) body.source_lang = params.sourceLang;
        if (params.formality && params.formality !== 'default') body.formality = params.formality;

        response = await fetch(`${baseUrl}/v2/translate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        break;
      }

      case 'createCustomApiCall': {
        const method = params.method || 'GET';
        const path = params.path;
        if (!path) throw new Error('API path is required');

        const fetchOptions: RequestInit = { method, headers };
        if (params.body && method === 'POST') {
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
      console.error('[DeepL] API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response!.json();
    const translatedText = result?.translations?.[0]?.text || '';

    return new Response(JSON.stringify({ ...result, translatedText, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[DeepL] Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
