import { corsHeaders } from '../_shared/cors.ts';

console.log('Aircall Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Aircall Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiId, apiToken, action, ...actionInputs } = await req.json();

    if (!apiId || !apiToken) {
      console.error('Aircall Proxy - API credentials are missing');
      throw new Error('Aircall API ID and API Token are required');
    }

    console.log(`Aircall Proxy - Processing action: ${action}`);

    const baseUrl = 'https://api.aircall.io';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    // Create base64 encoded auth string
    const auth = btoa(`${apiId}:${apiToken}`);

    switch (action) {
      case 'get_calls':
        endpoint = '/v1/calls';
        if (actionInputs.from || actionInputs.to || actionInputs.order) {
          const params = new URLSearchParams();
          if (actionInputs.from) params.append('from', actionInputs.from);
          if (actionInputs.to) params.append('to', actionInputs.to);
          if (actionInputs.order) params.append('order', actionInputs.order);
          endpoint += `?${params.toString()}`;
        }
        break;

      case 'get_call':
        endpoint = `/v1/calls/${actionInputs.callId}`;
        break;

      case 'create_call':
        endpoint = '/v1/calls';
        method = 'POST';
        requestBody = {
          to: actionInputs.phoneNumber,
          from: actionInputs.fromNumber,
          user_id: actionInputs.userId,
        };
        break;

      case 'transfer_call':
        endpoint = `/v1/calls/${actionInputs.callId}/transfer`;
        method = 'POST';
        requestBody = {
          user_id: actionInputs.userId,
        };
        break;

      case 'hangup_call':
        endpoint = `/v1/calls/${actionInputs.callId}/hangup`;
        method = 'POST';
        break;

      case 'get_users':
        endpoint = '/v1/users';
        break;

      case 'get_user':
        endpoint = `/v1/users/${actionInputs.userId}`;
        break;

      case 'get_contacts':
        endpoint = '/v1/contacts';
        if (actionInputs.phoneNumber || actionInputs.email) {
          const params = new URLSearchParams();
          if (actionInputs.phoneNumber) params.append('phone_number', actionInputs.phoneNumber);
          if (actionInputs.email) params.append('email', actionInputs.email);
          endpoint += `?${params.toString()}`;
        }
        break;

      case 'create_contact':
        endpoint = '/v1/contacts';
        method = 'POST';
        requestBody = {
          first_name: actionInputs.firstName,
          last_name: actionInputs.lastName,
          phone_numbers: [{ label: 'Work', value: actionInputs.phoneNumber }],
          ...(actionInputs.email && { emails: [{ label: 'Work', value: actionInputs.email }] }),
          ...(actionInputs.company && { company_name: actionInputs.company }),
        };
        break;

      case 'update_contact':
        endpoint = `/v1/contacts/${actionInputs.contactId}`;
        method = 'PUT';
        requestBody = {
          first_name: actionInputs.firstName,
          last_name: actionInputs.lastName,
          ...(actionInputs.phoneNumber && { phone_numbers: [{ label: 'Work', value: actionInputs.phoneNumber }] }),
          ...(actionInputs.email && { emails: [{ label: 'Work', value: actionInputs.email }] }),
          ...(actionInputs.company && { company_name: actionInputs.company }),
        };
        break;

      case 'delete_contact':
        endpoint = `/v1/contacts/${actionInputs.contactId}`;
        method = 'DELETE';
        break;

      case 'get_numbers':
        endpoint = '/v1/numbers';
        break;

      case 'custom_api_call':
        endpoint = actionInputs.endpoint;
        method = actionInputs.method || 'GET';
        if (actionInputs.requestBody) {
          try {
            requestBody = JSON.parse(actionInputs.requestBody);
          } catch (error) {
            throw new Error('Invalid JSON in request body');
          }
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    console.log(`Aircall Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Aircall Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      console.error('Aircall Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Aircall Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      calls: Array.isArray(result?.calls) ? result.calls : null,
      call: !Array.isArray(result) && ['get_call', 'create_call'].includes(action) ? result : null,
      users: Array.isArray(result?.users) ? result.users : null,
      user: !Array.isArray(result) && action === 'get_user' ? result : null,
      contacts: Array.isArray(result?.contacts) ? result.contacts : null,
      contact: !Array.isArray(result) && ['create_contact', 'update_contact'].includes(action) ? result : null,
      numbers: Array.isArray(result?.numbers) ? result.numbers : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Aircall Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      calls: null,
      call: null,
      users: null,
      user: null,
      contacts: null,
      contact: null,
      numbers: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});