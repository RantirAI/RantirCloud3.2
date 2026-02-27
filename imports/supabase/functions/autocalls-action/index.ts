import { corsHeaders } from "../_shared/cors.ts";

const AUTOCALLS_API_BASE = "https://api.autocalls.com/v1";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      apiKey, 
      action, 
      phoneNumber, 
      name, 
      campaignId, 
      message, 
      controlAction,
      leadId
    } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    console.log(`[Autocalls] Action: ${action}`);

    let url = AUTOCALLS_API_BASE;
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'addLead':
        if (!phoneNumber) throw new Error('Phone number is required');
        url = `${AUTOCALLS_API_BASE}/leads`;
        body = {
          phone: phoneNumber,
          ...(name && { name }),
          ...(campaignId && { campaign_id: campaignId })
        };
        break;

      case 'sendSms':
        if (!phoneNumber || !message) throw new Error('Phone number and message are required');
        url = `${AUTOCALLS_API_BASE}/sms`;
        body = {
          phone: phoneNumber,
          message
        };
        break;

      case 'campaignControl':
        if (!campaignId || !controlAction) throw new Error('Campaign ID and control action are required');
        url = `${AUTOCALLS_API_BASE}/campaigns/${campaignId}/${controlAction}`;
        body = {};
        break;

      case 'makePhoneCall':
        if (!phoneNumber || !message) throw new Error('Phone number and message are required');
        url = `${AUTOCALLS_API_BASE}/calls`;
        body = {
          phone: phoneNumber,
          message
        };
        break;

      case 'deleteLead':
        if (!leadId) throw new Error('Lead ID is required');
        url = `${AUTOCALLS_API_BASE}/leads/${leadId}`;
        method = 'DELETE';
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[Autocalls] Request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Autocalls] Error:', responseData);
      throw new Error(responseData.message || 'Autocalls API request failed');
    }

    console.log('[Autocalls] Success');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Autocalls] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
