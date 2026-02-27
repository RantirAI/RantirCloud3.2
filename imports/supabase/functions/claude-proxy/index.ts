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
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Anthropic API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.anthropic.com';
    let endpoint = '/v1/messages';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'askClaude': {
        body = {
          model: params.model || 'claude-sonnet-4-20250514',
          max_tokens: params.maxTokens || 1024,
          messages: [{ role: 'user', content: params.message }],
        };
        if (params.systemPrompt) {
          body.system = params.systemPrompt;
        }
        if (params.temperature !== undefined && params.temperature !== null) {
          body.temperature = params.temperature;
        }
        break;
      }

      case 'extractStructuredData': {
        let schemaText = '';
        try {
          const schemaObj = JSON.parse(params.schema);
          schemaText = JSON.stringify(schemaObj, null, 2);
        } catch {
          schemaText = params.schema;
        }

        const prompt = `Extract structured data from the following text according to this JSON schema:

Schema:
\`\`\`json
${schemaText}
\`\`\`

Text to parse:
"""
${params.text}
"""

${params.instructions ? `Additional instructions: ${params.instructions}` : ''}

Return ONLY valid JSON that matches the schema. Do not include any explanation or markdown formatting.`;

        body = {
          model: params.model || 'claude-sonnet-4-20250514',
          max_tokens: params.maxTokens || 2048,
          messages: [{ role: 'user', content: prompt }],
          system: 'You are a data extraction specialist. Extract structured data from text according to the provided schema. Always return valid JSON only, with no additional text or formatting.',
        };
        break;
      }

      case 'createCustomApiCall':
        endpoint = params.endpoint || '/v1/messages';
        method = params.method || 'POST';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`Claude: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.error?.message || data.message || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract text response
    let responseText = '';
    if (data.content && Array.isArray(data.content)) {
      responseText = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }

    // For extractStructuredData, try to parse the response as JSON
    let structuredData = null;
    if (action === 'extractStructuredData' && responseText) {
      try {
        structuredData = JSON.parse(responseText);
      } catch {
        // Keep as string if not valid JSON
        structuredData = responseText;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response: responseText,
      data: structuredData || data,
      usage: data.usage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Claude proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
