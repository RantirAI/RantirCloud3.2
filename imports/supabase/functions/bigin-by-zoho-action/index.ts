import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      action, 
      contactId, 
      firstName, 
      lastName, 
      email, 
      phone,
      dealName,
      amount,
      stage
    } = await req.json();
    
    if (!apiKey) {
      throw new Error('OAuth 2.0 access token is required');
    }

    const baseUrl = 'https://www.zohoapis.com/bigin/v1';
    const headers = {
      'Authorization': `Zoho-oauthtoken ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    if (action === 'create_contact') {
      if (!firstName || !lastName) {
        throw new Error('First name and last name are required');
      }

      const response = await fetch(`${baseUrl}/Contacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: [{
            First_Name: firstName,
            Last_Name: lastName,
            ...(email && { Email: email }),
            ...(phone && { Phone: phone }),
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Bigin API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'update_contact') {
      if (!contactId || !firstName || !lastName) {
        throw new Error('Contact ID, first name, and last name are required');
      }

      const response = await fetch(`${baseUrl}/Contacts/${contactId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          data: [{
            First_Name: firstName,
            Last_Name: lastName,
            ...(email && { Email: email }),
            ...(phone && { Phone: phone }),
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Bigin API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'get_contact') {
      if (!contactId) throw new Error('Contact ID is required');

      const response = await fetch(`${baseUrl}/Contacts/${contactId}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Bigin API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    } else if (action === 'create_deal') {
      if (!dealName) throw new Error('Deal name is required');

      const response = await fetch(`${baseUrl}/Deals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: [{
            Deal_Name: dealName,
            ...(amount && { Amount: amount }),
            ...(stage && { Stage: stage }),
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Bigin API error: ${response.status} - ${errorData}`);
      }

      result = await response.json();
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bigin by Zoho error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
