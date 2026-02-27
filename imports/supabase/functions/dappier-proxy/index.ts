import { corsHeaders } from '../_shared/cors.ts';

// Dappier Real-Time AI Data API
const DAPPIER_API_BASE = 'https://api.dappier.com/app';

// Default model IDs
const DEFAULT_AI_MODEL_ID = 'am_01j06ytn18ejftedz6dyhz2b15';
const DEFAULT_STOCK_AI_MODEL_ID = 'am_01j749h8pbf7ns8r1bq9s2evrh';
const DEFAULT_SPORTS_DATA_MODEL_ID = 'dm_01j0pb465keqmatq9k83dthx34';
const DEFAULT_LIFESTYLE_DATA_MODEL_ID = 'dm_01j0q82s4bfjmsqkhs3ywm3x6y';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      apiKey,
      query,
      aiModelId,
      dataModelId,
      numResults,
      searchOperator,
      similarityTopK,
      ref,
    } = body;

    console.log('Dappier proxy called with action:', action);

    if (!apiKey) throw new Error('API key is required');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result: Record<string, any> = { success: true, error: null };

    // Helper for AI model calls (POST /app/aimodel/{aiModelId})
    const aiModelCall = async (q: string, modelId: string) => {
      if (!modelId) throw new Error('AI Model ID is required');
      const payload: Record<string, any> = {
        query: q,
        ai_model_id: modelId,
      };
      if (similarityTopK) payload.similarity_top_k = similarityTopK;
      if (numResults) payload.num_articles_ref = numResults;
      if (ref) payload.ref = ref;

      console.log('Calling AI model:', modelId, 'with query:', q);
      const response = await fetch(`${DAPPIER_API_BASE}/aimodel/${modelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dappier API error [${response.status}]: ${errorText}`);
      }
      return await response.json();
    };

    // Helper for data model calls (POST /app/datamodel/{dataModelId})
    const dataModelCall = async (q: string, modelId: string) => {
      if (!modelId) throw new Error('Data Model ID is required');
      const payload: Record<string, any> = {
        query: q,
        data_model_id: modelId,
      };
      if (numResults) payload.num_results = numResults;
      if (searchOperator) payload.search_operator = searchOperator;

      console.log('Calling data model:', modelId, 'with query:', q);
      const response = await fetch(`${DAPPIER_API_BASE}/datamodel/${modelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dappier API error [${response.status}]: ${errorText}`);
      }
      return await response.json();
    };

    switch (action) {
      // Real-time web search -> AI model
      case 'realTimeWebSearch':
      case 'realTimeSearch': {
        if (!query) throw new Error('Query is required');
        const modelId = aiModelId || DEFAULT_AI_MODEL_ID;
        console.log('Real-time web search for:', query);
        result.data = await aiModelCall(query, modelId);
        break;
      }

      // Stock market -> AI model (stock-specific)
      case 'stockMarketDataSearch':
      case 'stockRecommendation': {
        const modelId = aiModelId || DEFAULT_STOCK_AI_MODEL_ID;
        console.log('Getting stock market data');
        result.data = await aiModelCall(query || "What are today's top stock picks?", modelId);
        break;
      }

      // Sports news -> Data model (NOT AI model)
      case 'sportsNewsSearch':
      case 'sportsPredictions': {
        const modelId = dataModelId || DEFAULT_SPORTS_DATA_MODEL_ID;
        console.log('Getting sports news via data model');
        result.data = await dataModelCall(query || "What are today's top sports headlines?", modelId);
        break;
      }

      // Lifestyle news -> Data model (NOT AI model)
      case 'lifestyleNewsSearch': {
        const modelId = dataModelId || DEFAULT_LIFESTYLE_DATA_MODEL_ID;
        console.log('Getting lifestyle news via data model');
        result.data = await dataModelCall(query || "What are today's top lifestyle stories?", modelId);
        break;
      }

      // Generic AI recommendation (kept for backward compat)
      case 'aiRecommendation': {
        if (!query) throw new Error('Query is required');
        const modelId = aiModelId || DEFAULT_AI_MODEL_ID;
        console.log('Getting AI recommendation for query:', query);
        result.data = await aiModelCall(query, modelId);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Dappier operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dappier proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
