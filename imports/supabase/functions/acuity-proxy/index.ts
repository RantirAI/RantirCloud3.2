import { corsHeaders } from '../_shared/cors.ts';

console.log('Acuity Scheduling Proxy Function Starting');

Deno.serve(async (req) => {
  console.log(`Acuity Proxy - ${req.method} request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, apiKey, action, ...actionInputs } = await req.json();

    if (!userId) {
      console.error('Acuity Proxy - User ID is missing');
      throw new Error('Acuity Scheduling User ID is required');
    }

    if (!apiKey) {
      console.error('Acuity Proxy - API key is missing');
      throw new Error('Acuity Scheduling API Key is required');
    }

    console.log(`Acuity Proxy - Processing action: ${action}`);

    const baseUrl = 'https://acuityscheduling.com/api/v1';
    let endpoint = '';
    let method = 'GET';
    let requestBody = null;
    let queryParams = '';

    // Create base64 encoded auth string
    const auth = btoa(`${userId}:${apiKey}`);

    switch (action) {
      case 'add_blocked_time':
        endpoint = '/blocks';
        method = 'POST';
        requestBody = {
          start: actionInputs.startTime,
          end: actionInputs.endTime,
          calendarID: actionInputs.calendarID || '',
          notes: actionInputs.notes || '',
        };
        break;

      case 'create_appointment':
        endpoint = '/appointments';
        method = 'POST';
        requestBody = {
          appointmentTypeID: actionInputs.appointmentTypeID,
          datetime: actionInputs.datetime,
          firstName: actionInputs.firstName,
          lastName: actionInputs.lastName,
          email: actionInputs.email,
          phone: actionInputs.phone || '',
          notes: actionInputs.notes || '',
        };
        break;

      case 'create_client':
        endpoint = '/clients';
        method = 'POST';
        requestBody = {
          firstName: actionInputs.firstName,
          lastName: actionInputs.lastName,
          email: actionInputs.email,
          phone: actionInputs.phone || '',
        };
        break;

      case 'reschedule_appointment':
        endpoint = `/appointments/${actionInputs.appointmentId}/reschedule`;
        method = 'PUT';
        requestBody = {
          datetime: actionInputs.datetime,
        };
        break;

      case 'update_client':
        endpoint = `/clients/${actionInputs.clientId}`;
        method = 'PUT';
        requestBody = {};
        if ((actionInputs as any).firstName) (requestBody as any).firstName = (actionInputs as any).firstName;
        if ((actionInputs as any).lastName) (requestBody as any).lastName = (actionInputs as any).lastName;
        if ((actionInputs as any).email) (requestBody as any).email = (actionInputs as any).email;
        if ((actionInputs as any).phone) (requestBody as any).phone = (actionInputs as any).phone;
        break;

      case 'find_appointments':
        endpoint = '/appointments';
        const appointmentParams = new URLSearchParams();
        if (actionInputs.minDate) appointmentParams.append('minDate', actionInputs.minDate);
        if (actionInputs.maxDate) appointmentParams.append('maxDate', actionInputs.maxDate);
        if (actionInputs.appointmentTypeID) appointmentParams.append('appointmentTypeID', actionInputs.appointmentTypeID);
        if (actionInputs.clientId) appointmentParams.append('clientID', actionInputs.clientId);
        queryParams = appointmentParams.toString();
        break;

      case 'find_client':
        endpoint = '/clients';
        const clientParams = new URLSearchParams();
        if (actionInputs.email) clientParams.append('email', actionInputs.email);
        if (actionInputs.phone) clientParams.append('phone', actionInputs.phone);
        if (actionInputs.name) clientParams.append('name', actionInputs.name);
        queryParams = clientParams.toString();
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
        if (actionInputs.queryParams) {
          queryParams = actionInputs.queryParams.startsWith('?') 
            ? actionInputs.queryParams.slice(1) 
            : actionInputs.queryParams;
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    const fullUrl = `${baseUrl}${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    console.log(`Acuity Proxy - Making ${method} request to: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    console.log(`Acuity Proxy - Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      console.error('Acuity Proxy - API error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Acuity Proxy - Request successful');

    const successResponse = {
      success: true,
      data: result,
      appointments: Array.isArray(result) && action === 'find_appointments' ? result : null,
      appointment: !Array.isArray(result) && ['create_appointment', 'reschedule_appointment'].includes(action) ? result : null,
      clients: Array.isArray(result) && action === 'find_client' ? result : null,
      client: !Array.isArray(result) && ['create_client', 'update_client'].includes(action) ? result : null,
      availability: Array.isArray(result) && action === 'get_availability' ? result : null,
      error: null,
    };

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Acuity Proxy - Error:', errorMessage);
    
    const errorResponse = {
      success: false,
      data: null,
      appointments: null,
      appointment: null,
      clients: null,
      client: null,
      availability: null,
      error: errorMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});