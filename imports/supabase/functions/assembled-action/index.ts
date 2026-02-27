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
    const { apiKey, action, agentId, scheduleData } = await req.json();
    
    if (!apiKey) {
      throw new Error("Assembled API key is required");
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    if (action === 'get_agent') {
      const response = await fetch(`https://api.assembled.com/v1/agents/${agentId}`, {
        headers,
      });

      result = await response.json();
    } else if (action === 'list_agents') {
      const response = await fetch('https://api.assembled.com/v1/agents', {
        headers,
      });

      result = await response.json();
    } else if (action === 'create_schedule') {
      const response = await fetch('https://api.assembled.com/v1/schedules', {
        method: 'POST',
        headers,
        body: scheduleData,
      });

      result = await response.json();
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Assembled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
