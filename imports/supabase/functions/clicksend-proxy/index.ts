import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, apiKey, action, ...params } = await req.json();

    if (!username || !apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Username and API key are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://rest.clicksend.com/v3';
    const authHeader = 'Basic ' + btoa(`${username}:${apiKey}`);
    let endpoint = '';
    let method = 'GET';
    let body: any = null;

    switch (action) {
      case 'sendSms':
        endpoint = '/sms/send';
        method = 'POST';
        body = {
          messages: [{
            to: params.to,
            body: params.body,
            from: params.from || undefined,
            schedule: params.schedule || undefined,
          }],
        };
        break;

      case 'sendMms':
        endpoint = '/mms/send';
        method = 'POST';
        body = {
          messages: [{
            to: params.to,
            body: params.body,
            media_file: params.mediaUrl,
            subject: params.subject || undefined,
          }],
        };
        break;

      case 'createContact':
        endpoint = `/lists/${params.listId}/contacts`;
        method = 'POST';
        body = {
          phone_number: params.phoneNumber,
          email: params.email || undefined,
          first_name: params.firstName || undefined,
          last_name: params.lastName || undefined,
          custom_1: params.customFields ? JSON.parse(params.customFields).custom_1 : undefined,
          custom_2: params.customFields ? JSON.parse(params.customFields).custom_2 : undefined,
          custom_3: params.customFields ? JSON.parse(params.customFields).custom_3 : undefined,
          custom_4: params.customFields ? JSON.parse(params.customFields).custom_4 : undefined,
        };
        break;

      case 'updateContact':
        endpoint = `/lists/${params.listId}/contacts/${params.contactId}`;
        method = 'PUT';
        body = {};
        if (params.phoneNumber) body.phone_number = params.phoneNumber;
        if (params.email) body.email = params.email;
        if (params.firstName) body.first_name = params.firstName;
        if (params.lastName) body.last_name = params.lastName;
        break;

      case 'deleteContact':
        endpoint = `/lists/${params.listId}/contacts/${params.contactId}`;
        method = 'DELETE';
        break;

      case 'createContactList':
        endpoint = '/lists';
        method = 'POST';
        body = {
          list_name: params.listName,
        };
        break;

      case 'findContactByEmail': {
        endpoint = `/lists/${params.listId}/contacts`;
        method = 'GET';
        // Will filter in response
        break;
      }

      case 'findContactByPhone': {
        endpoint = `/lists/${params.listId}/contacts`;
        method = 'GET';
        // Will filter in response
        break;
      }

      case 'findContactList': {
        endpoint = '/lists';
        method = 'GET';
        break;
      }

      case 'customApiCall':
        endpoint = params.endpoint;
        method = params.method || 'GET';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`ClickSend: ${method} ${baseUrl}${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      console.error('ClickSend API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || data.response_msg || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post-process for find actions
    let resultData = data;
    if (action === 'findContactByEmail' && params.email) {
      const contacts = data.data?.contacts || [];
      resultData = { ...data, data: { contacts: contacts.filter((c: any) => c.email === params.email) } };
    } else if (action === 'findContactByPhone' && params.phoneNumber) {
      const contacts = data.data?.contacts || [];
      resultData = { ...data, data: { contacts: contacts.filter((c: any) => c.phone_number === params.phoneNumber) } };
    } else if (action === 'findContactList' && params.listName) {
      const lists = data.data?.lists || [];
      resultData = { ...data, data: { lists: lists.filter((l: any) => l.list_name.toLowerCase().includes(params.listName.toLowerCase())) } };
    }

    return new Response(JSON.stringify({ success: true, data: resultData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ClickSend proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
