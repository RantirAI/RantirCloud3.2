import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, apiKey, email, username, password } = await req.json();
    
    console.log('Aminos proxy called with action:', action);

    if (!apiKey) {
      throw new Error('Aminos API key is required');
    }

    if (!email || !username || !password) {
      throw new Error('Email, username, and password are required');
    }

    // API call to create user on Aminos One
    const response = await fetch('https://api.aminos.one/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Aminos API error:', response.status, errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Aminos API success:', result);

    return new Response(JSON.stringify({
      success: true,
      userId: result.id,
      userData: result,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Aminos proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      userId: null,
      userData: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});