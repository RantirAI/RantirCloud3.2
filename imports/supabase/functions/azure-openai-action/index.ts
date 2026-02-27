import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      endpoint, 
      deploymentName, 
      action, 
      prompt, 
      maxTokens = 500, 
      temperature = 0.7 
    } = await req.json();

    if (!apiKey || !endpoint || !deploymentName) {
      throw new Error('API key, endpoint, and deployment name are required');
    }

    console.log(`[Azure OpenAI] Action: ${action}`);

    if (action !== 'askGpt') {
      throw new Error(`Unknown action: ${action}`);
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

    console.log(`[Azure OpenAI] Request to: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Azure OpenAI] Error:', responseData);
      throw new Error(responseData.error?.message || 'Azure OpenAI API request failed');
    }

    const aiResponse = responseData.choices?.[0]?.message?.content || '';

    console.log('[Azure OpenAI] Success');

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Azure OpenAI] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
