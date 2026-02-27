import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action: rawAction, apiKey, templateId, data, htmlContent, url, objectId, customEndpoint, customMethod, customBody } = await req.json();
    
    // Default action if not provided
    const action = rawAction || 'getAccountInformation';
    
    console.log('APITemplate.io proxy called with action:', action);

    if (!apiKey) {
      throw new Error('APITemplate.io API key is required');
    }

    // Centralized action to endpoint mapping
    const actionEndpoints: Record<string, { endpoint: string; method: string }> = {
      'createImage': { endpoint: 'https://rest.apitemplate.io/v2/create-image', method: 'POST' },
      'createPdf': { endpoint: 'https://rest.apitemplate.io/v2/create-pdf', method: 'POST' },
      'createPdfFromHtml': { endpoint: 'https://rest.apitemplate.io/v2/create-pdf', method: 'POST' },
      'createPdfFromUrl': { endpoint: 'https://rest.apitemplate.io/v2/create-pdf', method: 'POST' },
      'deleteObject': { endpoint: 'https://rest.apitemplate.io/v2/delete-object', method: 'GET' },
      'getAccountInformation': { endpoint: 'https://rest.apitemplate.io/v2/account-information', method: 'GET' },
      'listObjects': { endpoint: 'https://rest.apitemplate.io/v2/list-objects', method: 'GET' },
    };
    let endpoint = '';
    let method = 'GET';
    let body: string | null = null;
    
    if (action === 'customApiCall') {
      if (!customEndpoint) {
        throw new Error('Custom endpoint is required for custom API call');
      }
      endpoint = `https://rest.apitemplate.io${customEndpoint}`;
      method = customMethod || 'GET';
      if (customBody) {
        body = JSON.stringify(JSON.parse(customBody));
      }
    } else if (actionEndpoints[action as string]) {
      const config = actionEndpoints[action as string];
      endpoint = config.endpoint;
      method = config.method;
      
      // Build request body based on action
      switch (action) {
        case 'createImage':
        case 'createPdf':
          if (!templateId) {
            throw new Error(`Template ID is required for ${action}`);
          }
          body = JSON.stringify({
            template_id: templateId,
            data: data ? JSON.parse(data) : {},
          });
          break;
        case 'createPdfFromHtml':
          if (!htmlContent) {
            throw new Error('HTML content is required for createPdfFromHtml');
          }
          body = JSON.stringify({
            html: htmlContent,
            data: data ? JSON.parse(data) : {},
          });
          break;
        case 'createPdfFromUrl':
          if (!url) {
            throw new Error('URL is required for createPdfFromUrl');
          }
          body = JSON.stringify({
            url: url,
            data: data ? JSON.parse(data) : {},
          });
          break;
        case 'deleteObject':
          if (!objectId) {
            throw new Error('Object ID is required for deleteObject');
          }
          // The API expects GET with transaction_ref as query param
          endpoint = `${endpoint}?transaction_ref=${encodeURIComponent(objectId)}`;
          body = null;
          break;
      }
    } else {
      throw new Error('Invalid action');
    }

    console.log('APITemplate.io API call:', method, endpoint);

    // Build headers - only include Content-Type when we have a body
    const headers: Record<string, string> = {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const makeRequest = async (requestEndpoint: string) => {
      const response = await fetch(requestEndpoint, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('APITemplate.io API error:', response.status, errorData);
        return { success: false, status: response.status, errorData };
      }

      const result = await response.json();
      console.log('APITemplate.io API success:', result);
      return { success: true, result };
    };

    // Execute request
    let requestResult = await makeRequest(endpoint);

    if (!requestResult.success) {
      throw new Error(`API error ${requestResult.status}: ${requestResult.errorData}`);
    }

    const result = requestResult.result;

    return new Response(JSON.stringify({
      success: result.success || true,
      download_url: result.download_url,
      file_size: result.file_size,
      transaction_ref: result.transaction_ref,
      status: result.status || 'completed',
      error: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('APITemplate.io proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      download_url: null,
      file_size: null,
      transaction_ref: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});