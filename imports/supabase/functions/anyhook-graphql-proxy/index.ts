import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, serverUrl, endpointUrl, query, variables } = await req.json();
    
    console.log('Anyhook GraphQL proxy called with action:', action);

    if (!serverUrl) {
      throw new Error('Server URL is required');
    }

    if (!endpointUrl) {
      throw new Error('Endpoint URL is required');
    }

    if (!query) {
      throw new Error('GraphQL query is required');
    }

    let parsedVariables = {};
    if (variables) {
      try {
        parsedVariables = JSON.parse(variables);
      } catch (e) {
        throw new Error('Variables must be valid JSON');
      }
    }

    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: parsedVariables,
        endpointUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anyhook GraphQL API error:', response.status, errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Anyhook GraphQL API success:', result);

    return new Response(JSON.stringify({
      success: !result.errors || result.errors.length === 0,
      data: result.data,
      errors: result.errors || [],
      error: result.errors ? result.errors.map((e: any) => e.message).join(', ') : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Anyhook GraphQL proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      errors: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});