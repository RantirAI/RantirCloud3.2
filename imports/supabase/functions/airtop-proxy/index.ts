import { corsHeaders } from '../_shared/cors.ts';

const AIRTOP_API_BASE = 'https://api.airtop.ai/api/v1';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action,
      apiKey,
      sessionId,
      url,
      selector,
      text,
      fields,
      profileName,
      query,
      scrapeConfig,
      paginationConfig,
      filePath,
      apiEndpoint,
      apiPayload,
      windowId
    } = await req.json();

    if (!apiKey) {
      throw new Error('Airtop API key is required');
    }

    let apiUrl = '';
    let requestMethod = 'GET';
    let requestBody: any = null;

    // Helper function to check if a string is a valid UUID
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Build request based on action
    switch (action) {
      case 'create_session':
        apiUrl = `${AIRTOP_API_BASE}/sessions`;
        requestMethod = 'POST';
        requestBody = {
          configuration: {
            persistProfile: true
          }
        };
        // Only include baseProfileId if profileName is a valid UUID
        if (profileName && isValidUUID(profileName)) {
          requestBody.configuration.baseProfileId = profileName;
        }
        break;
      case 'navigate':
        if (!sessionId || !url) {
          throw new Error('Session ID and URL are required for navigate action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/navigate`;
        requestMethod = 'POST';
        requestBody = { url };
        break;
      case 'create_window':
        if (!sessionId) {
          throw new Error('Session ID is required for create window action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows`;
        requestMethod = 'POST';
        requestBody = {};
        break;
      case 'click':
        if (!sessionId || !windowId || !selector) {
          throw new Error('Session ID, windowId and selector are required for click action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/click`;
        requestMethod = 'POST';
        requestBody = { elementDescription: selector };
        break;
      case 'type':
        if (!sessionId || !windowId || !selector || !text) {
          throw new Error('Session ID, windowId, selector, and text are required for type action');
        }
        // Fallback to a generic "text-input" endpoint if available; otherwise use /type
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/type`;
        requestMethod = 'POST';
        requestBody = { elementDescription: selector, text };
        break;
      case 'hover':
        if (!sessionId || !windowId || !selector) {
          throw new Error('Session ID, windowId and selector are required for hover action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/hover`;
        requestMethod = 'POST';
        requestBody = { elementDescription: selector };
        break;
      case 'page_query':
        if (!sessionId || !windowId || !query) {
          throw new Error('Session ID, windowId and query are required for page query action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/page-query`;
        requestMethod = 'POST';
        requestBody = { prompt: query };
        break;
      case 'smart_scrape':
        if (!sessionId || !windowId || !scrapeConfig) {
          throw new Error('Session ID, windowId and scrape config are required for smart scrape action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/scrape-content`;
        requestMethod = 'POST';
        requestBody = typeof scrapeConfig === 'string' ? JSON.parse(scrapeConfig) : scrapeConfig;
        break;
      case 'paginated_extraction':
        if (!sessionId || !windowId || !paginationConfig) {
          throw new Error('Session ID, windowId and pagination config are required for paginated extraction action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/paginated-extraction`;
        requestMethod = 'POST';
        requestBody = typeof paginationConfig === 'string' ? JSON.parse(paginationConfig) : paginationConfig;
        break;
      case 'upload_file':
        if (!sessionId || !filePath) {
          throw new Error('Session ID and file path are required for upload file action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/upload`;
        requestMethod = 'POST';
        requestBody = { filePath };
        break;
      case 'custom_api':
        if (!sessionId || !apiEndpoint) {
          throw new Error('Session ID and API endpoint are required for custom API action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}${apiEndpoint}`;
        requestMethod = 'POST';
        requestBody = apiPayload ? (typeof apiPayload === 'string' ? JSON.parse(apiPayload) : apiPayload) : {};
        break;
      case 'extract':
        if (!sessionId || !selector || !fields) {
          throw new Error('Session ID, selector, and fields are required for extract action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/extract`;
        requestMethod = 'POST';
        requestBody = { selector, fields };
        break;
      case 'take_screenshot':
      case 'screenshot':
        if (!sessionId) {
          throw new Error('Session ID is required for screenshot action');
        }
        if (windowId) {
          apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/windows/${windowId}/screenshot`;
        } else {
          apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}/screenshot`;
        }
        requestMethod = 'POST';
        requestBody = {};
        break;
      case 'close_session':
        if (!sessionId) {
          throw new Error('Session ID is required for close session action');
        }
        apiUrl = `${AIRTOP_API_BASE}/sessions/${sessionId}`;
        requestMethod = 'DELETE';
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Airtop Proxy: Making ${requestMethod} request to ${apiUrl}`);
    if (requestBody) {
      console.log(`Airtop Proxy: Request body:`, JSON.stringify(requestBody, null, 2));
    }

    // Make request to Airtop API
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(apiUrl, {
      method: requestMethod,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    // Special retry logic for create_session with validation errors
    if (action === 'create_session' && response.status === 422) {
      try {
        const errorData = await response.json();
        console.log(`Airtop Proxy: create_session validation error:`, JSON.stringify(errorData, null, 2));
        
        // If the error is related to baseProfileId, retry without it
        if (errorData.errors?.some((err: any) => err.message?.includes('baseProfileId') || err.message?.includes('baseProfileName'))) {
          console.log(`Airtop Proxy: Retrying create_session without baseProfileId`);
          
          const retryBody = {
            configuration: {
              persistProfile: true
            }
          };
          
          response = await fetch(apiUrl, {
            method: requestMethod,
            headers,
            body: JSON.stringify(retryBody),
          });
          
          console.log(`Airtop Proxy: Retry response status: ${response.status}`);
        }
      } catch (parseError) {
        console.error(`Airtop Proxy: Failed to parse 422 error response:`, parseError);
      }
    }

    // If 404 and path seems to miss "/api", retry once with corrected URL
    if (response.status === 404 && apiUrl.includes('/v1/') && !apiUrl.includes('/api/v1/')) {
      const correctedUrl = apiUrl.replace('/v1/', '/api/v1/');
      console.warn(`Airtop Proxy: 404 on ${apiUrl}. Retrying with ${correctedUrl}`);
      response = await fetch(correctedUrl, {
        method: requestMethod,
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });
      apiUrl = correctedUrl; // update for downstream logs
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && contentType.includes('application/json');

    let responseData;
    if (isJsonResponse) {
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error(`Failed to parse JSON response:`, parseError);
        const textResponse = await response.text();
        console.error(`Raw response:`, textResponse);
        throw new Error(`Invalid JSON response from Airtop API. Got: ${textResponse.substring(0, 200)}...`);
      }
    } else {
      // Handle non-JSON responses (likely HTML error pages)
      const textResponse = await response.text();
      console.error(`Non-JSON response from Airtop API:`, textResponse);
      
      if (!response.ok) {
        // Check if it's an HTML error page
        if (textResponse.includes('<html>') || textResponse.includes('<!DOCTYPE')) {
          throw new Error(`Airtop API returned an error page. Status: ${response.status}. This usually indicates an invalid API key or incorrect endpoint.`);
        } else {
          throw new Error(`Airtop API error (${response.status}): ${textResponse}`);
        }
      }
      
      // For successful non-JSON responses, try to handle gracefully
      responseData = { message: textResponse };
    }

    if (!response.ok) {
      console.error(`Airtop API Error (${response.status}):`, responseData);
      const errorMessage = responseData?.message || responseData?.error || `HTTP ${response.status} error`;
      throw new Error(errorMessage);
    }

    console.log(`Airtop Proxy: Successfully processed ${action}`);

    // Format response based on action
    let formattedResponse = {
      success: true,
      data: responseData,
    };

    if (action === 'create_session') {
      (formattedResponse as any).sessionId = responseData.data?.id;
    } else if (action === 'extract') {
      (formattedResponse as any).extractedData = responseData.data;
    } else if (action === 'screenshot') {
      (formattedResponse as any).screenshotUrl = responseData.data?.url;
    }

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Airtop Proxy Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});