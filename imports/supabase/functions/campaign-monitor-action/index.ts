import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create MD5 hash for email
async function md5Hash(str: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(str.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, listId, email, name, customFields } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    let url = 'https://api.createsend.com/api/v3.2';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'addSubscriberToList':
        if (!listId || !email) throw new Error('List ID and email are required');
        url += `/lists/${listId}/subscribers.json`;
        method = 'POST';
        
        const subscriberData: any = {
          EmailAddress: email,
          Name: name || '',
          Resubscribe: true,
        };
        
        if (customFields) {
          try {
            subscriberData.CustomFields = typeof customFields === 'string' 
              ? JSON.parse(customFields) 
              : customFields;
          } catch (e) {
            console.error('Failed to parse custom fields:', e);
          }
        }
        
        body = JSON.stringify(subscriberData);
        break;
        
      case 'updateSubscriberDetails':
        if (!listId || !email) throw new Error('List ID and email are required');
        const emailHashUpdate = await md5Hash(email);
        url += `/subscribers/${listId}/${emailHashUpdate}.json`;
        method = 'PUT';
        
        const updateData: any = {
          EmailAddress: email,
          Name: name || '',
        };
        
        if (customFields) {
          try {
            updateData.CustomFields = typeof customFields === 'string' 
              ? JSON.parse(customFields) 
              : customFields;
          } catch (e) {
            console.error('Failed to parse custom fields:', e);
          }
        }
        
        body = JSON.stringify(updateData);
        break;
        
      case 'unsubscribeSubscriber':
        if (!listId || !email) throw new Error('List ID and email are required');
        const emailHashUnsub = await md5Hash(email);
        url += `/subscribers/${listId}/${emailHashUnsub}/unsubscribe.json`;
        method = 'POST';
        body = JSON.stringify({});
        break;
        
      case 'findSubscriber':
        if (!listId || !email) throw new Error('List ID and email are required');
        url += `/subscribers/${listId}.json?email=${encodeURIComponent(email)}`;
        method = 'GET';
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Campaign Monitor: ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':x')}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Campaign Monitor API error:', errorText);
      throw new Error(`Campaign Monitor API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in campaign-monitor-action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
