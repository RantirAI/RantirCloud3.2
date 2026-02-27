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
    const { apiKey, action, ...params } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ChargeKeep uses user's CRM subdomain
    const baseUrl = params.baseUrl || 'https://crm.chargekeep.com';
    let endpoint = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'addOrUpdateContact':
        endpoint = '/api/services/CRM/Import/ImportContact';
        body = {
          importType: params.importType || 'Lead',
          matchExisting: params.matchExisting !== false,
          contactId: params.contactId,
          personalInfo: {
            fullName: {
              firstName: params.firstName || '',
              lastName: params.lastName || '',
            },
            email1: params.email,
            mobilePhone: params.phone || '',
          },
        };
        break;

      case 'addOrUpdateContactExtended':
        endpoint = '/api/services/CRM/Import/ImportContact';
        body = {
          importType: params.importType || 'Lead',
          matchExisting: params.matchExisting !== false,
          contactId: params.contactId,
          personalInfo: {
            fullName: {
              firstName: params.firstName || '',
              lastName: params.lastName || '',
            },
            email1: params.email,
            mobilePhone: params.phone || '',
          },
          company: params.company ? { companyName: params.company } : undefined,
          addressInfo: (params.address || params.city || params.state || params.country || params.postalCode) ? {
            address1: params.address,
            city: params.city,
            state: params.state,
            country: params.country,
            postalCode: params.postalCode,
          } : undefined,
          customFields: params.customFields ? JSON.parse(params.customFields) : undefined,
        };
        break;

      case 'addOrUpdateSubscription':
        endpoint = '/api/services/CRM/OrderSubscription/Update';
        method = 'PUT';
        body = {
          contactId: params.contactId,
          contactXref: params.contactXref || params.contactEmail,
          productCode: params.productCode || params.planId,
          paymentPeriodType: params.paymentPeriodType || 'Monthly',
          hasRecurringBilling: params.hasRecurringBilling || false,
          status: params.status,
          startDate: params.startDate,
          endDate: params.endDate,
        };
        break;

      case 'createInvoice':
        endpoint = '/api/services/CRM/Import/ImportInvoice';
        body = {
          contactXref: params.contactEmail,
          amount: params.amount ? parseFloat(params.amount) : undefined,
          currency: params.currency || 'USD',
          description: params.description,
          dueDate: params.dueDate,
          lineItems: params.lineItems ? JSON.parse(params.lineItems) : undefined,
        };
        break;

      case 'createProduct':
        endpoint = '/api/services/CRM/Import/ImportProduct';
        body = {
          productCode: params.productCode || params.name,
          productName: params.name,
          description: params.description,
          price: params.price ? parseFloat(params.price) / 100 : undefined, // Convert cents to dollars
          currency: params.currency || 'USD',
          isRecurring: params.recurring || false,
          billingInterval: params.interval,
        };
        break;

      case 'getContactDetails':
        // GET request with query parameters
        method = 'GET';
        const queryParams = new URLSearchParams();
        if (params.contactId) queryParams.append('contactId', params.contactId);
        if (params.email) queryParams.append('userEmail', params.email);
        endpoint = `/api/services/CRM/Contact/GetContactData?${queryParams.toString()}`;
        break;

      case 'createCustomApiCall':
        endpoint = params.endpoint || '/api/services/CRM/Contact/GetContactData';
        method = params.method || 'POST';
        body = params.body ? JSON.parse(params.body) : null;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`ChargeKeep: ${method} ${baseUrl}${endpoint}`);
    if (body) {
      console.log('ChargeKeep request body:', JSON.stringify(body));
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
    
    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    
    // Check if response looks like HTML (error page)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('ChargeKeep API returned HTML response:', responseText.substring(0, 500));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ChargeKeep API returned an HTML page instead of JSON. This usually means the endpoint is incorrect or authentication failed.',
        details: `Endpoint: ${endpoint}, Status: ${response.status}`,
        hint: 'Please verify your API key and that your ChargeKeep instance URL is correct.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('ChargeKeep API returned non-JSON response:', responseText.substring(0, 500));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ChargeKeep API returned an invalid response format.',
        details: responseText.substring(0, 200)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('ChargeKeep API error:', data);
      return new Response(JSON.stringify({ 
        success: false, 
        error: data.message || data.error || data.Error || 'API request failed', 
        details: data 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ChargeKeep proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
