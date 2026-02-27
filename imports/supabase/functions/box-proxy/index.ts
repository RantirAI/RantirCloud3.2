import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, action, method, endpoint, body, queryParams } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (action !== "createCustomApiCall") {
      throw new Error(`Unknown action: ${action}`);
    }

    if (!endpoint) {
      throw new Error("Endpoint is required");
    }

    const baseUrl = "https://api.box.com";
    let url = `${baseUrl}${endpoint}`;

    // Add query parameters if provided
    if (queryParams) {
      const parsedParams = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
      const queryString = new URLSearchParams(parsedParams).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const httpMethod = method || "GET";
    console.log(`Making ${httpMethod} request to ${url}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body && ["POST", "PUT", "PATCH"].includes(httpMethod)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Box API error:", responseData);
      throw new Error(responseData.message || `API request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        status: "success",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in box-proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
