import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, subdomain, action, employeeId, firstName, lastName, email } = await req.json();
    
    if (!apiKey || !subdomain) {
      throw new Error('API key and subdomain are required');
    }

    const baseUrl = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`;
    const headers = {
      'Authorization': `Basic ${btoa(apiKey + ':x')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    let result;

    if (action === 'get_employee') {
      if (!employeeId) throw new Error('Employee ID is required');
      
      const response = await fetch(`${baseUrl}/employees/${employeeId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`BambooHR API error: ${response.status}`);
      }

      result = await response.json();
    } else if (action === 'list_employees') {
      const response = await fetch(`${baseUrl}/employees/directory`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`BambooHR API error: ${response.status}`);
      }

      result = await response.json();
    } else if (action === 'add_employee') {
      if (!firstName || !lastName) {
        throw new Error('First name and last name are required');
      }

      const response = await fetch(`${baseUrl}/employees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          firstName,
          lastName,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(`BambooHR API error: ${response.status}`);
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
    console.error('BambooHR error:', error);
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
