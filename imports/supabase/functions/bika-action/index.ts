import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, tableId, recordId, recordData, filter, endpoint, method, customData } = await req.json();
    
    if (!apiKey) {
      throw new Error("Bika API key is required");
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;
    let response;

    switch (action) {
      case 'createRecord':
        response = await fetch(`https://api.bika.ai/v1/tables/${tableId}/records`, {
          method: 'POST',
          headers,
          body: JSON.stringify(recordData),
        });
        result = await response.json();
        break;

      case 'findRecords':
        response = await fetch(`https://api.bika.ai/v1/tables/${tableId}/records?${new URLSearchParams(filter || {})}`, {
          headers,
        });
        result = await response.json();
        break;

      case 'findRecord':
        response = await fetch(`https://api.bika.ai/v1/tables/${tableId}/records/${recordId}`, {
          headers,
        });
        result = await response.json();
        break;

      case 'updateRecord':
        response = await fetch(`https://api.bika.ai/v1/tables/${tableId}/records/${recordId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(recordData),
        });
        result = await response.json();
        break;

      case 'deleteRecord':
        response = await fetch(`https://api.bika.ai/v1/tables/${tableId}/records/${recordId}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        break;

      case 'createCustomApiCall':
        response = await fetch(`https://api.bika.ai/v1${endpoint}`, {
          method: method || 'GET',
          headers,
          body: customData ? JSON.stringify(customData) : undefined,
        });
        result = await response.json();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bika error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
