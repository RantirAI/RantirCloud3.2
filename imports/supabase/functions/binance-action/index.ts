import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, apiSecret, action, symbol, interval, limit } = await req.json();
    
    // Map frontend action names to backend handlers
    const actionMap: Record<string, string> = {
      'fetchCryptoPairPrice': 'get_price',
      'get_price': 'get_price',
      'get_klines': 'get_klines',
      'get_24hr_stats': 'get_24hr_stats',
      'get_account_info': 'get_account_info',
    };
    
    const mappedAction = actionMap[action] || action;
    
    // Only require API credentials for private endpoints
    const privateEndpoints = ['get_account_info'];
    if (privateEndpoints.includes(mappedAction) && (!apiKey || !apiSecret)) {
      throw new Error("Binance API key and secret are required for account operations");
    }
    
    let result;

    if (mappedAction === 'get_price') {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      result = await response.json();
    } else if (mappedAction === 'get_klines') {
      const params = new URLSearchParams({
        symbol,
        interval: interval || '1h',
        limit: limit?.toString() || '100'
      });
      const response = await fetch(`https://api.binance.com/api/v3/klines?${params}`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      result = await response.json();
    } else if (mappedAction === 'get_24hr_stats') {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      result = await response.json();
    } else if (mappedAction === 'get_account_info') {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      
      const crypto = await import('https://deno.land/std@0.177.0/node/crypto.ts');
      const signature = crypto.createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');

      const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
        headers: {
          'X-MBX-APIKEY': apiKey,
        },
      });
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      result = await response.json();
    } else {
      throw new Error(`Unknown action: ${mappedAction}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Binance error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
