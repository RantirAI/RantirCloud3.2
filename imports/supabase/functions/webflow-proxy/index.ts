
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
        delay *= 2; // exponential backoff
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
      delay *= 2; // exponential backoff
    }
  }

  throw new Error("Max retries reached");
}

// Validate the API key format
function validateApiKey(apiKey: string): { valid: boolean; message?: string } {
  if (!apiKey) {
    return { valid: false, message: "API key is required" };
  }
  
  // Basic validation for Webflow API keys - they're typically 64 chars long
  if (apiKey.length < 30) {
    return { 
      valid: false, 
      message: "API key appears to be invalid. Webflow API keys are typically longer strings." 
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

// Set cached response
function setCachedResponse(cacheKey: string, data: any, ttlSeconds: number = 300): void {
  apiCache.set(cacheKey, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

serve(async (req: Request) => {
  console.log("Webflow proxy function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    let apiKey: string | null = null;
    let pathname = '/sites'; // Default path
    let queryParams = '';
    let reqMethod = 'GET'; // Default method
    let reqBody = null;
    let skipCache = false;

    // Process request based on method
    if (req.method === "POST") {
      // Parse the request body for POST requests
      const body = await req.json();
      
      console.log("Function invoked with POST body:", body);
      
      apiKey = body.apiKey;
      pathname = body.path || '/sites';
      queryParams = body.queryParams || '';
      reqMethod = body.method || 'GET';
      reqBody = body.body || null;
      skipCache = body.skipCache || false;
      
    } else {
      // Extract API key from Authorization header for GET requests
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
      
      // Also check query param for API key (for GET requests)
      const url = new URL(req.url);
      const apiKeyParam = url.searchParams.get('api_key');
      if (apiKeyParam) {
        apiKey = apiKeyParam;
        console.log("Using API key from query parameter");
      }

      // Check if we should skip cache
      skipCache = url.searchParams.get('skipCache') === 'true';

      // Determine which Webflow API endpoint to call based on the request path
      pathname = url.pathname.replace('/api/webflow-proxy', '') || '/sites';
      
      // Ensure we're using v2 API endpoints
      if (pathname === '/sites') {
        pathname = '/v2/sites';
        console.log("Redirecting to V2 API endpoint for sites");
      }
      
      // Handle query parameters
      const urlSearchParams = new URLSearchParams(url.search);
      urlSearchParams.delete('api_key'); // Remove api_key from forwarded query params
      urlSearchParams.delete('skipCache'); // Remove skipCache from forwarded query params
      
      // Convert site_id parameter to siteId for v2 API
      if (urlSearchParams.has('site_id')) {
        const siteId = urlSearchParams.get('site_id');
        urlSearchParams.delete('site_id');
        urlSearchParams.append('siteId', siteId!);
      }
      
      // Add any additional query parameters to the API URL
      queryParams = urlSearchParams.toString() ? `?${urlSearchParams.toString()}` : '';
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing API key", 
          statusCode: 400 
        }),
        {
          status: 200, // We always return 200 to the client but include error details
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate API key
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: apiKeyValidation.message || "Invalid Webflow API key",
          statusCode: 400,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format the API URL correctly:
    // 1. Handle path formatting
    let formattedPath = pathname.replace(/^\//, ''); // Remove leading slash if present
    
    // 2. Handle collections URL format - path needs to be /sites/:site_id/collections
    if (formattedPath.includes('collections') && !formattedPath.includes('/sites/')) {
      // Extract siteId from query parameters if it exists
      const urlParams = new URLSearchParams(queryParams);
      const siteId = urlParams.get('siteId');
      
      if (siteId) {
        // Remove siteId from query params since it will be in the path
        urlParams.delete('siteId');
        queryParams = urlParams.toString() ? `?${urlParams.toString()}` : '';
        
        // Build the correct path format for collections
        formattedPath = formattedPath.replace('v2/collections', `v2/sites/${siteId}/collections`);
        console.log("Fixed collections path format to:", formattedPath);
      }
    }
    
    // 3. Construct the full URL with domain and path
    let fullApiUrl = `https://api.webflow.com/${formattedPath}${queryParams}`;
    console.log("Webflow API URL:", fullApiUrl);
    console.log("Webflow API Method:", reqMethod);

    // Generate a cache key based on the API key (first 10 chars)
    const cacheKey = apiKey.substring(0, 10); // Use part of API key as rate limit cache key
    
    // Generate a full cache key for the response
    const requestCacheKey = generateCacheKey(
      formattedPath + queryParams, 
      reqMethod,
      apiKey.substring(0, 10)
    );
    
    // Check for cached response first
    if (reqMethod === 'GET' && !skipCache) {
      const cachedResponse = getCachedResponse(requestCacheKey);
      if (cachedResponse) {
        console.log("Returning cached response for:", fullApiUrl);
        return new Response(
          JSON.stringify({
            success: true,
            result: cachedResponse,
            fromCache: true
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    const now = Date.now();
    const cachedLimit = rateLimitCache.get(cacheKey);

    // Check if we're still in a rate-limited state
    if (cachedLimit && cachedLimit.remaining <= 0 && now < cachedLimit.resetTime) {
      const waitTime = Math.ceil((cachedLimit.resetTime - now) / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webflow API rate limit exceeded. Please try again in ${waitTime} seconds.`,
          waitTime: waitTime,
          statusCode: 429
        }),
        {
          status: 200, // Return 200 to client with error details
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Proxying ${reqMethod} request to Webflow API: ${fullApiUrl}`);

    // Set up headers for Webflow API request
    const headers = {
      "Authorization": `Bearer ${apiKey.trim()}`,
      "accept": "application/json",
      "Content-Type": "application/json",
    };

    // Make request to Webflow API
    const requestOptions: RequestInit = {
      method: reqMethod,
      headers,
    };

    // Add body for non-GET requests when provided
    if (reqBody && reqMethod !== 'GET') {
      requestOptions.body = JSON.stringify(reqBody);
    }

    // Use our retry mechanism with rate-limiting handling
    let response;
    try {
      response = await fetchWithRetry(fullApiUrl, requestOptions);
      
      // Update rate limit info in cache
      const rateLimit = {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '10'),
        timestamp: now,
        resetTime: now + (parseInt(response.headers.get('retry-after') || '60') * 1000)
      };
      rateLimitCache.set(cacheKey, rateLimit);
    } catch (error: any) {
      console.error("Fetch error:", error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webflow API connection error: ${error.message}`,
          statusCode: 500
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Webflow API response status:", response.status);
    
    // Handle rate limit responses directly
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webflow API rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          waitTime: retryAfter,
          statusCode: 429
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get response data
    let result;
    let responseText = '';
    
    try {
      responseText = await response.text();
      
      console.log("Response text (first 100 chars):", responseText.substring(0, 100));
      
      // Check for empty response
      if (!responseText.trim()) {
        throw new Error('Empty response received from server');
      }
      
      // Check if it's HTML by looking for common HTML tags
      if (responseText.trim().toLowerCase().startsWith('<!doctype') || 
          responseText.includes('<html') || 
          responseText.includes('<body')) {
        throw new Error('Received HTML response instead of JSON from Webflow API');
      }
      
      // Try to parse as JSON
      result = JSON.parse(responseText);
      
      // Special handling for collection items - extract field data if present
      if (pathname.includes('/collections') && pathname.includes('/items')) {
        if (result.items) {
          // If we have items with fieldData, extract all unique fields
          const allFields = new Map();
          
          result.items.forEach((item: any) => {
            const itemFields = item.fieldData || item;
            
            Object.entries(itemFields).forEach(([key, value]) => {
              if (!key.startsWith('_') && key !== 'id' && !allFields.has(key)) {
                allFields.set(key, {
                  id: key,
                  name: key,
                  type: typeof value === 'object' ? 'Object' : 'PlainText',
                });
              }
            });
          });
          
          // Add extracted fields to the result
          if (allFields.size > 0) {
            result.fields = Array.from(allFields.values());
          }
        }
      }
      
      // Normalize v2 API responses
      if (pathname === '/sites' || pathname === '/v2/sites') {
        // Ensure we have a consistent result format
        if (result.sites) {
          result = { result: result };
        } else if (!result.result) {
          result = { result: result };
        }
      } else if (pathname.includes('/collections') && !pathname.includes('/items')) {
        if (!result.result) {
          result = { result: result };
        }
      } else if (pathname.includes('/items')) {
        if (!result.result) {
          result = { result: result };
        }
      } else if (pathname.includes('/collection/') && pathname.includes('/schema')) {
        // Specific handling for collection schema
        if (!result.result) {
          result = { result: result };
        }
      }
      
      // Cache successful GET responses
      if (reqMethod === 'GET' && response.ok) {
        setCachedResponse(requestCacheKey, result);
      }
      
    } catch (err: any) {
      console.error("Error parsing response:", err, "Raw response:", responseText.substring(0, 100));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse Webflow API response: ${err.message}`,
          raw_response: responseText.substring(0, 200),
          statusCode: 500
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Handle error responses
    if (!response.ok) {
      console.error("Webflow API error:", response.status, result);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webflow API error: ${response.statusText}`,
          details: result,
          statusCode: response.status
        }),
        {
          status: 200, // We return 200 to client with error details
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in edge function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Edge function error: ${error.message}`,
        statusCode: 500
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
