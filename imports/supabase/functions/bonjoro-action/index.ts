import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If 502 or 503, retry (unless it's the last attempt)
      if ((response.status === 502 || response.status === 503) && i < retries) {
        const delay = INITIAL_DELAY * Math.pow(2, i); // Exponential backoff
        console.log(`Bonjoro API returned ${response.status}, retrying in ${delay}ms (attempt ${i + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries) throw error;
      const delay = INITIAL_DELAY * Math.pow(2, i);
      console.log(`Network error, retrying in ${delay}ms (attempt ${i + 1}/${retries + 1}):`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, email, firstName, lastName, note, endpoint, method, customData } = await req.json();
    
    console.log('Bonjoro action received:', action);
    
    if (!apiKey) {
      throw new Error("Bonjoro API key is required");
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    if (action === 'createGreet') {
      // First, create or update the profile
      const profileData: any = {
        email,
      };
      if (firstName) profileData.first_name = firstName;
      if (lastName) profileData.last_name = lastName;
      
      // Create profile first (Bonjoro API requires this)
      await fetchWithRetry('https://www.bonjoro.com/api/v2/profiles', {
        method: 'POST',
        headers,
        body: JSON.stringify(profileData),
      });
      
      // Then create the greet
      const greetData: any = {
        profiles: [email], // Bonjoro expects an array of email addresses
        note: note || '',
      };
      
      response = await fetchWithRetry('https://www.bonjoro.com/api/v2/greets', {
        method: 'POST',
        headers,
        body: JSON.stringify(greetData),
      });
    } else if (action === 'createCustomApiCall') {
      response = await fetchWithRetry(`https://www.bonjoro.com/api/v2${endpoint}`, {
        method: method || 'GET',
        headers,
        body: customData ? JSON.stringify(customData) : undefined,
      });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Check if response is ok before parsing
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bonjoro API error:', errorText);

      // Detect HTML error pages (502, 503, etc.)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        const status = response.status === 503 ? 503 : 502;
        const msg = status === 503
          ? 'Bonjoro API is temporarily unavailable (Service Unavailable). Please try again later.'
          : 'Bonjoro API is temporarily unavailable (Bad Gateway). Please try again in a few minutes.';
        return new Response(JSON.stringify({ error: msg, code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'BAD_GATEWAY' }), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }

      // Non-HTML error – forward status code and message
      return new Response(JSON.stringify({ error: `Bonjoro API error (${response.status}): ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bonjoro error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const isBadGateway = message.includes('Bad Gateway') || message.includes('Max retries') || message.includes('temporarily unavailable');
    const status = isBadGateway ? 502 : 500;
    const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' } as any;
    if (status === 502) headers['Retry-After'] = '60';
    return new Response(JSON.stringify({ error: message, code: status === 502 ? 'BAD_GATEWAY' : 'INTERNAL' }), {
      status,
      headers,
    });
  }
});
