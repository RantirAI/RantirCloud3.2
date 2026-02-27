import { corsHeaders } from '../_shared/cors.ts';

console.log('Acumbamail Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Acumbamail Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, ...actionInputs } = await req.json();

    if (!apiKey) {
      console.error('Acumbamail Proxy - API key is missing');
      throw new Error('Acumbamail API key is required');
    }

    console.log(`Acumbamail Proxy - Processing action: ${action}`);

    const baseUrl = 'https://acumbamail.com/api/1';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;

    switch (action) {
      case 'add_subscriber':
        endpoint = '/subscribers/';
        method = 'POST';
        requestBody = {
          list_id: actionInputs.listId,
          email: actionInputs.email,
          name: actionInputs.name || '',
          merge_fields: actionInputs.mergeFields ? JSON.parse(actionInputs.mergeFields) : {},
          status: actionInputs.status || 'active',
        };
        break;

      case 'update_subscriber':
        endpoint = `/subscribers/${actionInputs.subscriberId}/`;
        method = 'PUT';
        requestBody = {
          email: actionInputs.email,
          name: actionInputs.name || '',
          merge_fields: actionInputs.mergeFields ? JSON.parse(actionInputs.mergeFields) : {},
          status: actionInputs.status || 'active',
        };
        break;

      case 'get_subscriber':
        endpoint = `/subscribers/${actionInputs.subscriberId}/`;
        break;

      case 'delete_subscriber':
        endpoint = `/subscribers/${actionInputs.subscriberId}/`;
        method = 'DELETE';
        break;

      case 'get_lists':
        endpoint = '/lists/';
        break;

      case 'create_list':
        endpoint = '/lists/';
        method = 'POST';
        requestBody = {
          name: actionInputs.listName,
          company: actionInputs.company || '',
          description: actionInputs.description || '',
        };
        break;

      case 'update_list':
        endpoint = `/lists/${actionInputs.listId}/`;
        method = 'PUT';
        requestBody = {
          name: actionInputs.listName,
          company: actionInputs.company || '',
          description: actionInputs.description || '',
        };
        break;

      case 'delete_list':
        endpoint = `/lists/${actionInputs.listId}/`;
        method = 'DELETE';
        break;

      case 'get_campaigns':
        endpoint = '/campaigns/';
        break;

      case 'create_campaign':
        endpoint = '/campaigns/';
        method = 'POST';
        requestBody = {
          name: actionInputs.campaignName,
          subject: actionInputs.subject,
          template: actionInputs.template || '',
          list_id: actionInputs.listId,
          from_name: actionInputs.fromName,
          from_email: actionInputs.fromEmail,
          content: actionInputs.content || '',
        };
        break;

      case 'send_campaign':
        endpoint = `/campaigns/${actionInputs.campaignId}/send/`;
        method = 'POST';
        requestBody = {
          schedule_date: actionInputs.scheduleDate || null,
        };
        break;

      case 'get_campaign_stats':
        endpoint = `/campaigns/${actionInputs.campaignId}/stats/`;
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

    console.log(`Acumbamail Proxy - Making ${method} request to: ${baseUrl}${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Acumbamail Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `HTTP error! status: ${response.status}`;
      console.error('Acumbamail Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Acumbamail Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      subscriber: !Array.isArray(result) && ['add_subscriber', 'update_subscriber', 'get_subscriber'].includes(action) ? result : null,
      lists: Array.isArray(result) && action === 'get_lists' ? result : null,
      list: !Array.isArray(result) && ['create_list', 'update_list'].includes(action) ? result : null,
      campaigns: Array.isArray(result) && action === 'get_campaigns' ? result : null,
      campaign: !Array.isArray(result) && ['create_campaign'].includes(action) ? result : null,
      stats: !Array.isArray(result) && action === 'get_campaign_stats' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Acumbamail Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      subscriber: null,
      lists: null,
      list: null,
      campaigns: null,
      campaign: null,
      stats: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});