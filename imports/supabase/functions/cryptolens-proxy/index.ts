import { corsHeaders } from '../_shared/cors.ts';

const CRYPTOLENS_API_BASE = 'https://api.cryptolens.io/api';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      action, 
      accessToken,
      productId,
      licenseKey,
      customerName,
      customerEmail,
      companyName,
      period,
      maxNoOfMachines,
      f1, f2, f3,
      notes,
      customerId,
      method,
      endpoint,
      params
    } = body;

    console.log('Cryptolens proxy called with action:', action);

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let response;
    let responseData;

    switch (action) {
      case 'addCustomer': {
        if (!customerName) {
          throw new Error('Customer name is required');
        }

        console.log('Adding customer:', customerName);

        const params = new URLSearchParams({
          token: accessToken,
          Name: customerName,
        });

        if (customerEmail) params.append('Email', customerEmail);
        if (companyName) params.append('CompanyName', companyName);

        response = await fetch(`${CRYPTOLENS_API_BASE}/customer/AddCustomer`, {
          method: 'POST',
          headers,
          body: params.toString(),
        });

        responseData = await response.json();
        break;
      }

      case 'blockKey': {
        if (!productId) {
          throw new Error('Product ID is required');
        }
        if (!licenseKey) {
          throw new Error('License key is required');
        }

        console.log('Blocking license key');

        const params = new URLSearchParams({
          token: accessToken,
          ProductId: productId,
          Key: licenseKey,
        });

        response = await fetch(`${CRYPTOLENS_API_BASE}/key/BlockKey`, {
          method: 'POST',
          headers,
          body: params.toString(),
        });

        responseData = await response.json();
        break;
      }

      case 'createKey': {
        if (!productId) {
          throw new Error('Product ID is required');
        }

        console.log('Creating new license key');

        const params = new URLSearchParams({
          token: accessToken,
          ProductId: productId,
        });

        if (period) params.append('Period', period.toString());
        if (maxNoOfMachines) params.append('MaxNoOfMachines', maxNoOfMachines.toString());
        if (f1) params.append('F1', 'true');
        if (f2) params.append('F2', 'true');
        if (f3) params.append('F3', 'true');
        if (notes) params.append('Notes', notes);
        if (customerId) params.append('CustomerId', customerId);

        response = await fetch(`${CRYPTOLENS_API_BASE}/key/CreateKey`, {
          method: 'POST',
          headers,
          body: params.toString(),
        });

        responseData = await response.json();
        break;
      }

      case 'createCustomApiCall': {
        if (!endpoint) {
          throw new Error('Endpoint is required');
        }

        const httpMethod = method || 'POST';
        console.log('Custom API call:', httpMethod, endpoint);

        let requestParams = new URLSearchParams({ token: accessToken });
        
        if (params) {
          try {
            const additionalParams = typeof params === 'string' ? JSON.parse(params) : params;
            Object.entries(additionalParams).forEach(([key, value]) => {
              requestParams.append(key, String(value));
            });
          } catch (e) {
            console.warn('Invalid params JSON');
          }
        }

        response = await fetch(`${CRYPTOLENS_API_BASE}${endpoint}`, {
          method: httpMethod,
          headers,
          body: requestParams.toString(),
        });

        responseData = await response.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (responseData.result === 1 || responseData.Result === 1) {
      throw new Error(responseData.message || responseData.Message || 'Cryptolens operation failed');
    }

    console.log('Cryptolens operation successful');

    return new Response(JSON.stringify({
      success: true,
      licenseKey: responseData.key || responseData.Key || licenseKey,
      customerId: responseData.customerId || responseData.CustomerId,
      data: responseData,
      message: responseData.message || 'Operation completed successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cryptolens proxy error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
