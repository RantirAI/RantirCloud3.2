import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      apiToken, 
      spaceId, 
      datasheetId, 
      recordId, 
      fields, 
      view, 
      pageSize,
      // Custom API call parameters
      method: customMethod,
      endpointPath,
      requestBody,
      queryParams,
      customHeaders,
      urlParams
    } = await req.json();
    
    console.log('APITable proxy called with action:', action);

    if (!apiToken) {
      throw new Error('APITable API token is required');
    }

    let parsedFields: Record<string, any> = {};
    if (fields !== undefined && fields !== null) {
      if (typeof fields === 'string') {
        try {
          parsedFields = JSON.parse(fields);
        } catch (e) {
          throw new Error('Fields must be valid JSON string');
        }
      } else if (typeof fields === 'object') {
        parsedFields = fields as Record<string, any>;
      } else {
        throw new Error('Fields must be an object or JSON string');
      }
    }

    let endpoint = '';
    let method = 'GET';
    let body = null;

    const baseUrl = 'https://aitable.ai/fusion/v1';

    switch (action) {
      case 'createRecordAction':
        if (!datasheetId) throw new Error('Datasheet ID is required');
        endpoint = `${baseUrl}/datasheets/${datasheetId}/records`;
        method = 'POST';
        body = JSON.stringify({ records: [{ fields: parsedFields }] });
        break;
      case 'updateRecordAction':
        if (!datasheetId || !recordId) throw new Error('Datasheet ID and Record ID are required');
        endpoint = `${baseUrl}/datasheets/${datasheetId}/records`;
        method = 'PATCH';
        body = JSON.stringify({ records: [{ recordId, fields: parsedFields }] });
        break;
      case 'findRecordAction':
        if (!datasheetId) throw new Error('Datasheet ID is required');
        endpoint = `${baseUrl}/datasheets/${datasheetId}/records`;
        if (view) endpoint += `?viewId=${encodeURIComponent(view)}`;
        if (pageSize) endpoint += `${view ? '&' : '?'}pageSize=${pageSize}`;
        break;
      case 'customApiCall':
        if (!customMethod || !endpointPath) {
          throw new Error('HTTP method and endpoint path are required for custom API calls');
        }
        
        method = customMethod;
        let path = endpointPath;
        
        // Replace URL parameters if provided
        if (urlParams) {
          try {
            const params = typeof urlParams === 'string' ? JSON.parse(urlParams) : urlParams;
            Object.entries(params).forEach(([key, value]) => {
              path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
            });
          } catch (e) {
            throw new Error('URL parameters must be valid JSON');
          }
        }
        
        // Ensure path starts with /
        if (!path.startsWith('/')) {
          path = '/' + path;
        }
        
        endpoint = `${baseUrl}${path}`;
        
        // Add query parameters if provided
        if (queryParams) {
          try {
            const params = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              searchParams.append(key, String(value));
            });
            if (searchParams.toString()) {
              endpoint += `?${searchParams.toString()}`;
            }
          } catch (e) {
            throw new Error('Query parameters must be valid JSON');
          }
        }
        
        // Set request body if provided
        if (requestBody && (method === 'POST' || method === 'PATCH')) {
          try {
            body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
          } catch (e) {
            throw new Error('Request body must be valid JSON');
          }
        }
        break;
      default:
        throw new Error('Invalid action');
    }

    console.log('APITable API call:', method, endpoint);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };

    // Add spaceId header if provided
    if (spaceId) {
      headers['X-Space-Id'] = spaceId;
    }

    // Add custom headers if provided (for custom API calls)
    if (action === 'customApiCall' && customHeaders) {
      try {
        const custom = typeof customHeaders === 'string' ? JSON.parse(customHeaders) : customHeaders;
        Object.entries(custom).forEach(([key, value]) => {
          headers[key] = String(value);
        });
      } catch (e) {
        throw new Error('Custom headers must be valid JSON');
      }
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errJson = JSON.parse(errorText);
        console.error('APITable API error:', response.status, errJson);
        return new Response(JSON.stringify({
          success: false,
          data: errJson,
          records: errJson?.data?.records ?? null,
          record: errJson?.data?.record ?? null,
          error: errJson?.message || errJson?.error || `API error: ${response.status}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        console.error('APITable API error:', response.status, errorText);
        return new Response(JSON.stringify({
          success: false,
          data: null,
          records: null,
          record: null,
          error: errorText || `API error: ${response.status}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const result = await response.json();
    console.log('APITable API success:', result);

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return new Response(JSON.stringify({
      success: result.success,
      data: result.data,
      records: result.data?.records,
      record: result.data?.record || result.data,
      error: result.success ? null : result.message,
      status: response.status,
      headers: responseHeaders,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('APITable proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      data: null,
      records: null,
      record: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});