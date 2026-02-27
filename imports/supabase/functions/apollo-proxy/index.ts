import { corsHeaders } from '../_shared/cors.ts';

console.log('Apollo Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Apollo Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('Apollo Proxy - API key is missing');
      throw new Error('API key is required');
    }

    console.log(`Apollo Proxy - Processing action: ${action}`);

    // Validate inputs based on action
    if (action === 'enrich_company') {
      const domain = actionInputs.domain;
      if (!domain) {
        console.error('Apollo Proxy - Domain is required for company enrichment');
        throw new Error('Domain is required for company enrichment');
      }
      
      // Validate domain format (must have a TLD)
      if (!domain.includes('.') || domain.split('.').length < 2) {
        console.error('Apollo Proxy - Invalid domain format:', domain);
        throw new Error(`Invalid domain format: "${domain}". Please use full domain like "example.com"`);
      }
    }

    const baseUrl = 'https://api.apollo.io/v1';
    let url = '';
    let requestPayload = null;

    switch (action) {
      case 'match_person':
        url = `${baseUrl}/people/match`;
        requestPayload = actionInputs;
        break;

      case 'enrich_company':
        url = `${baseUrl}/organizations/enrich`;
        requestPayload = actionInputs;
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`Apollo Proxy - Making POST request to: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(requestPayload)
    });

    console.log(`Apollo Proxy - Response status: ${response.status}`);

    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error('Apollo Proxy - Failed to parse response JSON:', parseError);
      throw new Error(`Invalid JSON response from Apollo API (Status: ${response.status})`);
    }

    if (!response.ok) {
      console.error('Apollo Proxy - API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      const errorMessage = responseData?.message || 
                          responseData?.error?.message || 
                          responseData?.errors?.[0]?.message ||
                          `Apollo API error: ${response.status} ${response.statusText}`;
      
      throw new Error(errorMessage);
    }

    // Structure the response based on action type
    const result: any = {
      success: true,
      data: responseData
    };

    switch (action) {
      case 'match_person':
        result.person = responseData.person || null;
        result.organization = responseData.person?.organization || null;
        break;

      case 'enrich_company':
        result.organization = responseData.organization || null;
        break;
    }

    console.log('Apollo Proxy - Request successful');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Apollo Proxy - Error:', error instanceof Error ? error.message : 'Unknown error');
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});