import { corsHeaders } from "../_shared/cors.ts";

const ATTIO_API_BASE = "https://api.attio.com/v2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      accessToken, 
      action, 
      objectType, 
      recordId, 
      data: recordData, 
      listId, 
      entryId, 
      entryData,
      endpoint,
      method: customMethod,
      body: customBody
    } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    console.log(`[Attio] Action: ${action}`);

    let url = ATTIO_API_BASE;
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'createRecord':
        if (!objectType) throw new Error('Object type is required');
        url = `${ATTIO_API_BASE}/objects/${objectType}/records`;
        method = 'POST';
        body = JSON.parse(recordData);
        break;

      case 'updateRecord':
        if (!objectType || !recordId) throw new Error('Object type and record ID are required');
        url = `${ATTIO_API_BASE}/objects/${objectType}/records/${recordId}`;
        method = 'PATCH';
        body = JSON.parse(recordData);
        break;

      case 'findRecord':
        if (!objectType || !recordId) throw new Error('Object type and record ID are required');
        url = `${ATTIO_API_BASE}/objects/${objectType}/records/${recordId}`;
        break;

      case 'createEntry':
        if (!listId) throw new Error('List ID is required');
        url = `${ATTIO_API_BASE}/lists/${listId}/entries`;
        method = 'POST';
        body = JSON.parse(entryData);
        break;

      case 'updateEntry':
        if (!listId || !entryId) throw new Error('List ID and entry ID are required');
        url = `${ATTIO_API_BASE}/lists/${listId}/entries/${entryId}`;
        method = 'PATCH';
        body = JSON.parse(entryData);
        break;

      case 'findListEntry':
        if (!listId || !entryId) throw new Error('List ID and entry ID are required');
        url = `${ATTIO_API_BASE}/lists/${listId}/entries/${entryId}`;
        break;

      case 'createCustomApiCall':
        if (!endpoint) throw new Error('API endpoint is required');
        url = `${ATTIO_API_BASE}${endpoint}`;
        method = customMethod || 'GET';
        if (customBody) {
          body = JSON.parse(customBody);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[Attio] Request: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[Attio] Error:', responseData);
      throw new Error(responseData.message || 'Attio API request failed');
    }

    console.log('[Attio] Success');

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
    console.error('[Attio] Error:', error.message);
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
