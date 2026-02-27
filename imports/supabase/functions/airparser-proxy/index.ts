import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// In-memory rate limiting cache
const rateLimitCache = new Map<string, {
  timestamp: number;
  remaining: number;
  resetTime: number;
}>();

// Global shared cache to reduce API calls
interface CacheItem {
  data: any;
  expiry: number;
}

const apiCache = new Map<string, CacheItem>();

// Simple exponential backoff for retries
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let retries = 0;
  let delay = 1000;

  while (retries <= maxRetries) {
    try {
      console.log(`Attempt ${retries + 1}: Requesting ${url}`);
      const response = await fetch(url, options);
      
      // Check if we hit rate limit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60');
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
        
        // If this is our last retry, just return the rate limited response
        if (retries === maxRetries) {
          return response;
        }
        
        // Wait for the specified time before retrying
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
        delay *= 2;
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`Fetch error on attempt ${retries + 1}:`, error);
      
      if (retries === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
      delay *= 2;
    }
  }

  throw new Error("Max retries reached");
}

// Validate the API key format
function validateApiKey(apiKey: string): { valid: boolean; message?: string } {
  if (!apiKey) {
    return { valid: false, message: "API key is required" };
  }
  
  // Basic validation for Airparser API keys
  if (apiKey.length < 20) {
    return { 
      valid: false, 
      message: "API key appears to be invalid. Please check your Airparser API key." 
    };
  }

  return { valid: true };
}

// Generate a cache key
function generateCacheKey(path: string, method: string, apiKeyPart: string): string {
  return `${method}:${path}:${apiKeyPart}`;
}

// Check if response is cached
function getCachedResponse(cacheKey: string): any | null {
  const cachedItem = apiCache.get(cacheKey);
  if (!cachedItem) return null;
  
  // Check if cache has expired
  if (cachedItem.expiry < Date.now()) {
    apiCache.delete(cacheKey);
    return null;
  }
  
  return cachedItem.data;
}

// Store response in cache
function setCachedResponse(cacheKey: string, data: any, ttlSeconds = 300): void {
  const expiry = Date.now() + (ttlSeconds * 1000);
  apiCache.set(cacheKey, { data, expiry });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Received ${req.method} request to Airparser proxy`);
    
    // Parse request body
    const body = await req.json();
    const { apiKey, action, ...actionInputs } = body;

    // Validate API key
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.valid) {
      console.error('API key validation failed:', apiKeyValidation.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiKeyValidation.message,
          data: null,
          document_id: null,
          status: 'error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const baseUrl = 'https://api.airparser.com';
    let url = '';
    let method = 'GET';
    let options: RequestInit = {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    };

    // Build request based on action
    switch (action) {
      case 'get_document':
        if (!actionInputs.document_id) {
          throw new Error('Document ID is required for get_document action');
        }
        url = `${baseUrl}/docs/${actionInputs.document_id}/extended`;
        break;

      case 'upload_document':
        if (!actionInputs.inbox_id) {
          throw new Error('Inbox ID is required for upload_document action');
        }
        
        url = `${baseUrl}/inboxes/${actionInputs.inbox_id}/upload`;
        method = 'POST';
        
        // Download the file from the provided URL
        if (!actionInputs.document_url) {
          throw new Error('Document URL is required for upload_document action');
        }
        
        console.log(`Downloading file from: ${actionInputs.document_url}`);
        const fileResponse = await fetch(actionInputs.document_url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file from URL: ${fileResponse.status} - ${fileResponse.statusText}`);
        }
        
        const fileBlob = await fileResponse.blob();
        const fileName = actionInputs.document_url.split('/').pop() || 'document';
        
        const formData = new FormData();
        formData.append('file', fileBlob, fileName);
        
        if (actionInputs.meta) {
          try {
            // Validate JSON if provided
            JSON.parse(actionInputs.meta);
            formData.append('meta', actionInputs.meta);
          } catch (e) {
            throw new Error('Metadata must be valid JSON');
          }
        }
        
        options.method = method;
        options.body = formData;
        // Remove Content-Type header for FormData (browser will set it with boundary)
        if (options.headers) {
          delete (options.headers as any)['Content-Type'];
        }
        break;

      case 'list_documents':
        if (!actionInputs.inbox_id) {
          throw new Error('Inbox ID is required for list_documents action');
        }
        
        const queryParams = new URLSearchParams();
        if (actionInputs.page) queryParams.append('page', actionInputs.page.toString());
        if (actionInputs.from_date) queryParams.append('from', actionInputs.from_date);
        if (actionInputs.to_date) queryParams.append('to', actionInputs.to_date);
        
        url = `${baseUrl}/inboxes/${actionInputs.inbox_id}/docs`;
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
        break;

      case 'list_inboxes':
        url = `${baseUrl}/inboxes`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Check cache for GET requests (except for document uploads)
    let cacheKey = '';
    let cachedResponse = null;
    if (method === 'GET') {
      const apiKeyPart = apiKey.slice(-8); // Use last 8 chars for cache key
      cacheKey = generateCacheKey(url, method, apiKeyPart);
      cachedResponse = getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        console.log('Returning cached response for:', url);
        return new Response(
          JSON.stringify({
            success: true,
            data: cachedResponse,
            document_id: cachedResponse.document_id || cachedResponse.id || cachedResponse.documentId,
            status: 'success',
            error: null,
            cached: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Make the API request
    console.log(`Making ${method} request to: ${url}`);
    const response = await fetchWithRetry(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Airparser API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          document_id: null,
          status: 'error',
          error: `Airparser API error: ${response.status} - ${errorText}`
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('Airparser API response received successfully');

    // Cache GET responses
    if (method === 'GET' && cacheKey) {
      setCachedResponse(cacheKey, data, action === 'list_inboxes' ? 600 : 300); // Cache inboxes for 10 mins, others for 5 mins
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        document_id: data.document_id || data.id || data.documentId,
        status: data.status || 'success',
        error: null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in airparser-proxy function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        document_id: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});