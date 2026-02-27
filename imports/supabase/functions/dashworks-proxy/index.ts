import { corsHeaders } from '../_shared/cors.ts';

// Dashworks AI Knowledge Assistant API - correct v1 endpoint
const DASHWORKS_API_BASE = 'https://api.dashworks.ai/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      apiKey,
      question,
      message,
      botId,
      conversationId,
    } = body;

    console.log('Dashworks proxy called with action:', action);

    if (!apiKey) throw new Error('API key is required');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result: Record<string, any> = { success: true, error: null };

    switch (action) {
      // Frontend sends 'generateAnswer' or legacy 'askQuestion'
      case 'generateAnswer':
      case 'askQuestion': {
        // Accept both 'message' (correct) and 'question' (legacy) field names
        const msg = message || question;
        if (!msg) throw new Error('Message/question is required');
        if (!botId) throw new Error('Bot ID is required');

        console.log('Generating Dashworks answer:', msg.substring(0, 50));

        const payload: Record<string, any> = {
          message: msg,
          bot_id: botId,
        };
        if (conversationId) payload.conversation_id = conversationId;

        const response = await fetch(`${DASHWORKS_API_BASE}/answer`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Dashworks API error [${response.status}]: ${errorText}`);
        }

        result.data = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Dashworks operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dashworks proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
