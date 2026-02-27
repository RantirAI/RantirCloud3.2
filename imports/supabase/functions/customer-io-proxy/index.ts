import { corsHeaders } from '../_shared/cors.ts';

// Customer.io API
const CUSTOMERIO_TRACK_API = 'https://track.customer.io/api/v1';
const CUSTOMERIO_APP_API = 'https://api.customer.io/v1';
const CUSTOMERIO_BETA_API = 'https://beta-api.customer.io/v1/api';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      siteId,
      apiKey,
      appApiKey,
      customerId,
      email,
      attributes,
      eventName,
      eventData,
      campaignId,
      segmentId,
      broadcastId,
      messageData,
      // createCustomApiCall fields
      method,
      endpoint,
      requestBody,
      customHeaders,
    } = body;

    console.log('Customer.io proxy called with action:', action);

    // Track API uses Basic Auth (site_id:api_key)
    const trackAuth = 'Basic ' + btoa(`${siteId || ''}:${apiKey || ''}`);
    // App/Beta API uses Bearer token
    const appAuth = appApiKey ? `Bearer ${appApiKey}` : '';

    let result: Record<string, any> = { success: true, error: null };

    switch (action) {
      // Alias: frontend sends 'createEvent', maps to Track API event endpoint
      case 'createEvent':
      case 'trackEvent': {
        if (!siteId || !apiKey) throw new Error('Site ID and API Key are required');
        if (!customerId) throw new Error('Customer ID is required');
        if (!eventName) throw new Error('Event name is required');

        console.log('Tracking event:', eventName, 'for customer:', customerId);

        const response = await fetch(`${CUSTOMERIO_TRACK_API}/customers/${encodeURIComponent(customerId)}/events`, {
          method: 'POST',
          headers: { 'Authorization': trackAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: eventName, data: eventData || {} }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = { customerId, eventName, tracked: true };
        break;
      }

      // Generic API call handler
      case 'createCustomApiCall': {
        if (!appApiKey && (!siteId || !apiKey)) throw new Error('App API Key or Site ID + API Key required');
        if (!endpoint) throw new Error('Endpoint URL is required');

        const httpMethod = (method || 'GET').toUpperCase();
        console.log('Custom API call:', httpMethod, endpoint);

        // Determine which auth to use based on endpoint
        let authHeader: string;
        if (endpoint.includes('track.customer.io')) {
          authHeader = trackAuth;
        } else {
          authHeader = appAuth || trackAuth;
        }

        const reqHeaders: Record<string, string> = {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          ...(customHeaders || {}),
        };

        const fetchOptions: RequestInit = {
          method: httpMethod,
          headers: reqHeaders,
        };

        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
          fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
        }

        const response = await fetch(endpoint, fetchOptions);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          result.data = await response.json();
        } else {
          result.data = { response: await response.text() };
        }
        break;
      }

      case 'identifyCustomer': {
        if (!siteId || !apiKey) throw new Error('Site ID and API Key are required');
        if (!customerId) throw new Error('Customer ID is required');

        console.log('Identifying customer:', customerId);

        const payload: Record<string, any> = { ...(attributes || {}) };
        if (email) payload.email = email;

        const response = await fetch(`${CUSTOMERIO_TRACK_API}/customers/${encodeURIComponent(customerId)}`, {
          method: 'PUT',
          headers: { 'Authorization': trackAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = { customerId, identified: true };
        break;
      }

      case 'deleteCustomer': {
        if (!siteId || !apiKey) throw new Error('Site ID and API Key are required');
        if (!customerId) throw new Error('Customer ID is required');

        console.log('Deleting customer:', customerId);

        const response = await fetch(`${CUSTOMERIO_TRACK_API}/customers/${encodeURIComponent(customerId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': trackAuth },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = { customerId, deleted: true };
        break;
      }

      case 'trackAnonymousEvent': {
        if (!siteId || !apiKey) throw new Error('Site ID and API Key are required');
        if (!eventName) throw new Error('Event name is required');

        console.log('Tracking anonymous event:', eventName);

        const response = await fetch(`${CUSTOMERIO_TRACK_API}/events`, {
          method: 'POST',
          headers: { 'Authorization': trackAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: eventName, data: eventData || {} }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = { eventName, tracked: true };
        break;
      }

      case 'sendTransactionalEmail': {
        if (!appApiKey) throw new Error('App API Key is required');

        console.log('Sending transactional email');

        const response = await fetch(`${CUSTOMERIO_APP_API}/send/email`, {
          method: 'POST',
          headers: { 'Authorization': appAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData || {}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = await response.json();
        break;
      }

      case 'listCampaigns': {
        if (!appApiKey) throw new Error('App API Key is required');

        console.log('Listing campaigns');

        const response = await fetch(`${CUSTOMERIO_BETA_API}/campaigns`, {
          method: 'GET',
          headers: { 'Authorization': appAuth },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = await response.json();
        break;
      }

      case 'triggerBroadcast': {
        if (!appApiKey) throw new Error('App API Key is required');
        if (!broadcastId) throw new Error('Broadcast ID is required');

        console.log('Triggering broadcast:', broadcastId);

        const response = await fetch(`${CUSTOMERIO_BETA_API}/campaigns/${broadcastId}/triggers`, {
          method: 'POST',
          headers: { 'Authorization': appAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData || {}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = await response.json();
        break;
      }

      case 'listSegments': {
        if (!appApiKey) throw new Error('App API Key is required');

        console.log('Listing segments');

        const response = await fetch(`${CUSTOMERIO_BETA_API}/segments`, {
          method: 'GET',
          headers: { 'Authorization': appAuth },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Customer.io API error [${response.status}]: ${errorText}`);
        }

        result.data = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('Customer.io operation successful');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Customer.io proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
