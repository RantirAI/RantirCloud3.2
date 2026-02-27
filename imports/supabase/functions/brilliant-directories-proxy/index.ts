import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, websiteId, action, email, firstName, lastName, method, endpoint, body } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!websiteId) {
      throw new Error("Website ID is required");
    }

    if (!action) {
      throw new Error("Action is required");
    }

    const baseUrl = `https://${websiteId}.brilliantdirectories.com/api`;
    let url = baseUrl;
    let httpMethod = "POST";
    let requestBody: any = {};

    switch (action) {
      case "createNewUser":
        url = `${baseUrl}/users`;
        requestBody = {
          email,
          firstName,
          lastName,
        };
        break;

      case "createCustomApiCall":
        if (!endpoint) {
          throw new Error("Endpoint is required for custom API call");
        }
        url = `${baseUrl}${endpoint}`;
        httpMethod = method || "GET";
        requestBody = body ? (typeof body === 'string' ? JSON.parse(body) : body) : {};
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Making ${httpMethod} request to ${url}`);

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (["POST", "PUT", "PATCH"].includes(httpMethod)) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, fetchOptions);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Brilliant Directories API error:", responseData);
      throw new Error(responseData.message || `API request failed with status ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in brilliant-directories-proxy:", error);
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
