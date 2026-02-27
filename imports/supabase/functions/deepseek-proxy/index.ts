import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) throw new Error("DeepSeek API key is required");

    const baseUrl = 'https://api.deepseek.com';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    console.log('[DeepSeek] Action:', action);

    switch (action) {
      case 'askDeepseek': {
        const messages: any[] = [];
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.prompt });

        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: params.model || 'deepseek-chat',
            messages,
            max_tokens: params.maxTokens ? parseInt(String(params.maxTokens)) : 1024,
            temperature: params.temperature ? parseFloat(String(params.temperature)) : 0.7,
            top_p: params.topP ? parseFloat(String(params.topP)) : 1,
          }),
        });
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error('[DeepSeek] API error:', response!.status, errorText);
      return new Response(JSON.stringify({ error: errorText, status: 'error', statusCode: response!.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response!.json();
    const responseText = result?.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ ...result, response: responseText, status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[DeepSeek] Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
